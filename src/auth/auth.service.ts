import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
// import { PasswordResetOtp } from './entities/password-reset-otp.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';


@Injectable()
export class AuthService {

 private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,

    // @InjectRepository(PasswordResetOtp),
    // private passwordResetOtpRepo: Repository<PasswordResetOtp>,
  ) {}

  /**
   * Generate 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto) {
    const { email, password, fullName, role, phoneNumber } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const verificationOtp = this.generateOtp();
    const verificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user
    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      fullName,
      role,
      phoneNumber,
      isActive: true,
      emailVerified: false,
      verificationOtp,
      verificationOtpExpires,
    });

    await this.userRepo.save(user);

    // Send verification email with OTP
    await this.emailService.sendVerificationEmail(
      email,
      verificationOtp,
      fullName,
    );

    return {
      message: 'Registration successful. Please check your email for the OTP.',
      email: user.email,
      otpExpiresIn: '10 minutes',
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify role matches
    // if (user.role !== role) {
    //   throw new UnauthorizedException('Role does not match');
    // }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    return this.generateToken(user);
  }

  /**
   * Verify email with OTP
   */
  async verifyEmail(email: string, otp: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.verificationOtp) {
      throw new BadRequestException('No OTP found for this email');
    }

    if (user.verificationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (
      user.verificationOtpExpires &&
      user.verificationOtpExpires < new Date()
    ) {
      throw new BadRequestException('OTP has expired');
    }

    user.emailVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;

    await this.userRepo.save(user);

    try {
      await this.emailService.sendWelcomeOnboardEmail(
        user.email,
        user.fullName,
        user.role,
      );
    } catch (error) {
      // Log but don't rethrow — email failure shouldn't break verification
      this.logger.error(
        `Welcome email failed for ${user.email}: ${error.message}`,
        error.stack,
      );
    }

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  /**
   * Resend verification email with new OTP
   */
  async resendVerificationEmail(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new OTP
    const verificationOtp = this.generateOtp();
    const verificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationOtp = verificationOtp;
    user.verificationOtpExpires = verificationOtpExpires;

    await this.userRepo.save(user);

    // Send verification email with new OTP
    await this.emailService.sendVerificationEmail(
      email,
      verificationOtp,
      user.fullName,
    );

    return {
      message: 'Verification OTP sent to your email',
      otpExpiresIn: '10 minutes',
    };
  }

  /**
   * Request password reset - sends OTP to email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate OTP
    const passwordResetOtp = this.generateOtp();
    const passwordResetOtpExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save OTP to user
    user.passwordResetOtp = passwordResetOtp;
    user.passwordResetOtpExpires = passwordResetOtpExpires;
    await this.userRepo.save(user);

    // Send reset password email with OTP
    await this.emailService.sendResetPasswordEmail(
      email,
      passwordResetOtp,
      user.fullName,
    );

    return { message: 'Password reset OTP sent to your email' };
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.passwordResetOtp) {
      throw new BadRequestException('No password reset request found');
    }

    if (user.passwordResetOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (
      user.passwordResetOtpExpires &&
      user.passwordResetOtpExpires < new Date()
    ) {
      throw new BadRequestException('OTP has expired');
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;

    await this.userRepo.save(user);

    return { message: 'Password reset successfully' };
  }

  /**
   * Google OAuth - Create or find user
   */
  async googleLogin(profile: any) {
    const { emails, displayName, id: googleId, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      throw new BadRequestException('Email not provided by Google');
    }

    // Check if user exists
    let user = await this.userRepo.findOne({ where: { email } });

    if (user) {
      // Link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        await this.userRepo.save(user);
      }
    } else {
      // Create new user from Google profile
      user = this.userRepo.create({
        email,
        fullName: displayName || 'User',
        googleId,
        emailVerified: true, // Google verified email
        isActive: true,
        role: 'buyer' as any, // Default role
      });

      await this.userRepo.save(user);
    }

    return this.generateToken(user);
  }

  /**
   * Validate user from JWT payload
   */
  async validateUser(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  /**
   * Get full user profile (excluding sensitive fields)
   */
  async getUserProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Strip sensitive fields before returning
    const {
      password,
      verificationOtp,
      verificationOtpExpires,
      passwordResetOtp,
      passwordResetOtpExpires,
      ...safeUser
    } = user;

    return safeUser;
  }

  /**
   * Generate JWT token and return user data
   */
  private generateToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber || null,
        companyName: user.companyName || null,
        emailVerified: user.emailVerified,
      },
    };
  }
}
