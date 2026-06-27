import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddBankInfoDto } from './dto/add-bank-info.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import type { Express } from 'express';
import { UserRole, VerificationStatus } from './enums/user.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private cloudinaryService: CloudinaryService,
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
      user.isVerified = this.getSellerVerificationStatus(user);
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
}
