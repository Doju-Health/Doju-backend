import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiPropertyOptional({
    description: 'UUID of the order to be paid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Bulk order identifier (bulk-<uuid>)',
    example: 'bulk-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  bulkOrderId?: string;

  @ApiPropertyOptional({
    description: 'Callback URL to redirect user after payment completion',
    example: 'https://yourapp.com/payment-success',
  })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Flutterwave payment reference',
    example: 'ref_12345abcde',
  })
  @IsNotEmpty()
  @IsString()
  reference: string;
}

export class ConfirmDeliveryDto {
  @ApiProperty({
    description: 'UUID of the order that was delivered',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Bulk order identifier (bulk-<uuid>)',
    example: 'bulk-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  bulkOrderId?: string;

  @ApiPropertyOptional({
    description: 'Buyer feedback about the product',
    example: 'Great quality and fast delivery!',
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({
    description: 'Rating for the product (1-5 stars)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  rating?: number;
}

export class VerifyBankDetailsDto {
  @ApiProperty({
    description: 'Bank account number',
    example: '0123456789',
  })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({
    description: 'Bank code (e.g., 044)',
    example: '044',
  })
  @IsNotEmpty()
  @IsString()
  bankCode: string;
}
