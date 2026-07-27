import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddBankInfoDto } from './dto/add-bank-info.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { EmailService } from 'src/email/email.service';
import type { Express } from 'express';
import { UserRole, VerificationStatus } from './enums/user.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
  ) {}

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousVerificationStatus = user.isVerified;
    let profileImageUrl = dto.profileImageUrl ?? user.profileImageUrl;

    if (file) {
      profileImageUrl = await this.cloudinaryService.uploadImage(
        file,
        'doju/profiles',
      );
    }

    Object.assign(user, {
      ...dto,
      profileImageUrl,
    });

    if (user.role === UserRole.SELLER) {
      const nextVerificationStatus = this.getSellerVerificationStatus(user);
      user.isVerified = nextVerificationStatus;

      await this.userRepo.save(user);

      if (
        previousVerificationStatus !== VerificationStatus.PENDING &&
        nextVerificationStatus === VerificationStatus.PENDING
      ) {
        void this.notifyAdminsSellerVerificationPending(user).catch((error) => {
          this.logger.error(
            'Failed to send seller KYC pending review notification',
            error instanceof Error ? error.stack : String(error),
          );
        });
      }

      return user;
    }

    return this.userRepo.save(user);
  }

  async addBankInfo(userId: string, dto: AddBankInfoDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.accountNumber = dto.accountNumber;
    user.bankCode = dto.bankCode;
    user.accountName = dto.accountName;

    return this.userRepo.save(user);
  }

  private getSellerVerificationStatus(user: User): VerificationStatus {
    if (user.role !== UserRole.SELLER) {
      return user.isVerified;
    }

    const hasRequiredSellerFields = Boolean(
      user.companyName &&
        user.ninUrl &&
        user.businessAddress &&
        user.businessCity,
    );

    return hasRequiredSellerFields
      ? VerificationStatus.PENDING
      : VerificationStatus.UNVERIFIED;
  }

  private async notifyAdminsSellerVerificationPending(user: User): Promise<void> {
    const admins = await this.userRepo.find({
      where: [
        { role: UserRole.ADMIN, isActive: true, emailVerified: true },
        { role: UserRole.SUPER_ADMIN, isActive: true, emailVerified: true },
      ],
      select: ['id', 'fullName', 'email'],
    });

    if (admins.length === 0) {
      return;
    }

    const dashboardUrl =
      process.env.ADMIN_DASHBOARD_URL ?? '/admin/dashboard/users';

    await Promise.all(
      admins
        .filter((admin) => !!admin.email)
        .map((admin) =>
          this.emailService.sendSellerKycPendingReviewEmail({
            adminEmail: admin.email,
            adminName: admin.fullName,
            sellerName: user.fullName,
            sellerEmail: user.email,
            companyName: user.companyName,
            businessAddress: user.businessAddress,
            businessCity: user.businessCity,
            businessState: user.businessState,
            dashboardUrl,
          }),
        ),
    );
  }
}
