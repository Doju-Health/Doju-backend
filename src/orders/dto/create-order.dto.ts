import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Product UUID to order',
  })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: 5,
    description: 'Quantity of the product to order',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: '123 Main Street, New York, NY 10001',
    description: 'Delivery address for the order',
  })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({
    example: 'Please handle with care - fragile medical equipment',
    description: 'Special notes for the order',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
