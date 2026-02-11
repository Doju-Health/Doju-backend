import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'UUID of the order to be paid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

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
    description: 'Paystack payment reference',
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
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

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
