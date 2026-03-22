import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/users/enums/user.enum';

export class AdminUserResponseDto {
  @ApiProperty({ example: 'user-123', description: 'User unique identifier' })
  id: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  fullName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({
    example: '+2348012345678',
    description: 'Phone number',
    nullable: true,
  })
  phoneNumber?: string;

  @ApiProperty({ example: 'seller', enum: UserRole, description: 'User role' })
  role: UserRole;

  @ApiProperty({
    example: 'HealthEquip Ltd',
    description: 'Company name (seller only)',
    nullable: true,
  })
  companyName?: string;

  @ApiProperty({
    example: '123 Main Street, Lagos',
    description: 'Address',
    nullable: true,
  })
  address?: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: 'Profile image URL',
    nullable: true,
  })
  profileImageUrl?: string;

  @ApiProperty({
    example: 'LIC-12345',
    description: 'License number (seller only)',
    nullable: true,
  })
  licenseNumber?: string;

  @ApiProperty({
    example: 'RCP_123456789',
    description: 'Paystack recipient code (seller only)',
    nullable: true,
  })
  paystackRecipientCode?: string;

  @ApiProperty({ example: true, description: 'Email verification status' })
  emailVerified: boolean;

  @ApiProperty({ example: false, description: 'Seller verification status' })
  isVerified: boolean;

  @ApiProperty({ example: true, description: 'Active status' })
  isActive: boolean;

  @ApiProperty({
    example: '2025-02-09T10:30:00Z',
    description: 'Account creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-02-09T10:30:00Z',
    description: 'Account last update timestamp',
  })
  updatedAt: Date;
}
