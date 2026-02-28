import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({
    description: 'Product unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Quantity to add to cart',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({
    description: 'New item quantity',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Whether item is selected for checkout',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

export class CheckoutDto {
  @ApiProperty({
    description: 'Delivery address for this checkout',
    example: '12 Admiralty Way, Lekki Phase 1, Lagos',
  })
  @IsNotEmpty()
  @IsString()
  deliveryAddress: string;

  @ApiPropertyOptional({
    description: 'Optional note attached to the order(s)',
    example: 'Please call before delivery.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SelectAllDto {
  @ApiProperty({
    description: 'Select or deselect all cart items',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  selected: boolean;
}
