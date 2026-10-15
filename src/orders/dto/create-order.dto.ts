import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DeliveryAddressDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

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

  @ApiProperty({
    example: { address: '123 Main Street, Lagos, Nigeria', latitude: 6.578997, longitude: 3.349467 },
    description: 'Buyer delivery address and coordinates used for Chowdeck fee calculation',
  })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => DeliveryAddressDto)
  deliveryAddress: DeliveryAddressDto;

  @ApiPropertyOptional({
    example: 'Ikorodu',
    description: 'Delivery city for zone calculation',
  })
  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @ApiPropertyOptional({
    example: 'Ikorodu',
    description: 'Pickup store for the order',
  })
  @IsOptional()
  @IsString()
  pickupStore?: string;

  @ApiPropertyOptional({
    example: 'Lagos',
    description: 'Delivery state for zone calculation',
  })
  @IsOptional()
  @IsString()
  deliveryState?: string;

  @ApiPropertyOptional({
    example: 'Please handle with care - fragile medical equipment',
    description: 'Special notes for the order',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBulkOrdersDto {
  @ApiProperty({
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '223e4567-e89b-12d3-a456-426614174111',
    ],
    description: 'Array of product UUIDs to order',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiProperty({
    example: [2, 1],
    description: 'Array of quantities matching each product ID by index',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  quantities: number[];

  @ApiProperty({
    example: { address: '123 Main Street, Lagos, Nigeria', latitude: 6.578997, longitude: 3.349467 },
    description: 'Buyer delivery address and coordinates applied to all orders',
  })
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => DeliveryAddressDto)
  deliveryAddress: DeliveryAddressDto;

  @ApiPropertyOptional({
    example: 'Ikorodu',
    description: 'Delivery city for zone calculation',
  })
  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @ApiPropertyOptional({
    example: 'Ikorodu',
    description: 'Pickup store for the order',
  })
  @IsOptional()
  @IsString()
  pickupStore?: string;

  @ApiPropertyOptional({
    example: 'Lagos',
    description: 'Delivery state for zone calculation',
  })
  @IsOptional()
  @IsString()
  deliveryState?: string;

  @ApiPropertyOptional({
    example: 'Please deliver all items together if possible',
    description: 'Order notes applied to all orders in this request',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
