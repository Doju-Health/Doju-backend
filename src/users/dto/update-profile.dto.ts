import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

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
    example: { address: '123 Main Street, Lagos, Nigeria', latitude: 6.578997, longitude: 3.349467 },
    description: 'Personal address and delivery coordinates',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({
    example: { address: '123 Main Street, Lagos, Nigeria', latitude: 6.601838, longitude: 3.351486 },
    description: 'Business address and Chowdeck pickup coordinates',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  businessAddress?: AddressDto;

  @ApiPropertyOptional({
    example: 'Lagos',
    description: 'City from personal address',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Lagos State',
    description: 'State from personal address',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'Ikeja',
    description: 'City from business address',
  })
  @IsOptional()
  @IsString()
  businessCity?: string;

  @ApiPropertyOptional({
    example: 'Lagos State',
    description: 'State from business address',
  })
  @IsOptional()
  @IsString()
  businessState?: string;

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
