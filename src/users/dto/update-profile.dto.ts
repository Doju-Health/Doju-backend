import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Full name of the user',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'Phone number',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: '123 Main Street, Lagos, Nigeria',
    description: 'Address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Acme Medical Supplies',
    description: 'Company name (seller)',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: 'LIC-123456',
    description: 'License number (seller)',
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/nin.jpg',
    description: 'NIN document URL (seller)',
  })
  @IsOptional()
  @IsString()
  ninUrl?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/cac.jpg',
    description: 'CAC document URL (seller)',
  })
  @IsOptional()
  @IsString()
  cacUrl?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    description: 'Profile image URL (if not uploading a file)',
  })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}
