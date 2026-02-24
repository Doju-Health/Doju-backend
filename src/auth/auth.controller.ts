import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    type: RegisterDto,
    examples: {
      example1: {
        summary: 'Buyer registration',
        value: {
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: 'buyer',
          phoneNumber: '+1234567890',
        },
      },
      example2: {
        summary: 'Seller registration',
        value: {
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          password: 'SecurePass123',
          role: 'seller',
          phoneNumber: '+0987654321',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    schema: {
      example: {
        message:
          'Registration successful. Please check your email for the OTP.',
        email: 'john@example.com',
        otpExpiresIn: '10 minutes',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email already registered' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    type: LoginDto,
    examples: {
      buyer: {
        summary: 'Buyer login',
        value: {
          email: 'john@example.com',
          password: 'SecurePass123',
        },
      },
      seller: {
        summary: 'Seller login',
        value: {
          email: 'jane@example.com',
          password: 'SecurePass123',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john@example.com',
          role: 'buyer',
          fullName: 'John Doe',
          phoneNumber: '+1234567890',
          companyName: null,
          emailVerified: true,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or email not verified',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email with OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        otp: { type: 'string', minLength: 6, maxLength: 6 },
      },
      required: ['email', 'otp'],
      example: {
        email: 'john@example.com',
        otp: '123456',
      },
    },
  })
  @ApiOkResponse({
    description: 'Email verified successfully',
    schema: {
      example: {
        message: 'Email verified successfully',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john@example.com',
          fullName: 'John Doe',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired OTP' })
  async verifyEmail(@Body() body: { email: string; otp: string }) {
    if (!body.email || !body.otp) {
      throw new BadRequestException('Email and OTP are required');
    }
    return this.authService.verifyEmail(body.email, body.otp);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email with new OTP' })
  @ApiBody({
    type: ResendVerificationEmailDto,
    examples: {
      example1: {
        summary: 'Resend OTP',
        value: {
          email: 'john@example.com',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Verification email sent',
    schema: {
      example: {
        message: 'Verification OTP sent to your email',
        otpExpiresIn: '10 minutes',
      },
    },
  })
  async resendVerificationEmail(@Body() dto: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(dto.email);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google' })
  async googleAuth() {
    // This route is handled by Passport
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback - returns JWT token' })
  @ApiOkResponse({
    description: 'Google login successful',
    schema: {
      example: {
        message: 'Google login successful',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@gmail.com',
          fullName: 'User Name',
          role: 'buyer',
          emailVerified: true,
        },
      },
    },
  })
  async googleAuthCallback(@Req() req: any) {
    const result = await this.authService.googleLogin(req.user);
    return {
      message: 'Google login successful',
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john@example.com',
          fullName: 'John Doe',
          role: 'buyer',
          emailVerified: true,
          phoneNumber: '+1234567890',
          companyName: null,
          isActive: true,
          createdAt: '2026-01-19T10:30:00Z',
          updatedAt: '2026-01-19T10:30:00Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async getProfile(@Req() req: any) {
    return { user: req.user };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset - sends OTP to email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
      example: {
        email: 'john@example.com',
      },
    },
  })
  @ApiOkResponse({
    description: 'Password reset OTP sent',
    schema: {
      example: {
        message: 'Password reset OTP sent to your email',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'User not found' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        otp: { type: 'string', minLength: 6, maxLength: 6 },
        newPassword: { type: 'string', minLength: 8 },
      },
      required: ['email', 'otp', 'newPassword'],
      example: {
        email: 'john@example.com',
        otp: '123456',
        newPassword: 'NewSecurePass123',
      },
    },
  })
  @ApiOkResponse({
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password reset successfully',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired OTP' })
  async resetPassword(
    @Body() body: { email: string; otp: string; newPassword: string },
  ) {
    return this.authService.resetPassword(
      body.email,
      body.otp,
      body.newPassword,
    );
  }
}
