import {
  Controller,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import type { Express } from 'express';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update profile details (buyers or sellers). Supports optional profile image upload.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        phoneNumber: { type: 'string' },
        address: { type: 'string' },
        companyName: { type: 'string' },
        licenseNumber: { type: 'string' },
        profileImageUrl: { type: 'string' },
        profileImage: { type: 'string', format: 'binary' },
        cacUrl: { type: 'string' },
        ninUrl: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Profile updated successfully',
  })
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(user.id, dto, file);
  }
}
