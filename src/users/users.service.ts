import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import type { Express } from 'express';

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

    return this.userRepo.save(user);
  }
}
