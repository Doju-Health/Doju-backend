import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsIn,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PRODUCT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;

export class CreateProductDto {
  @ApiProperty({
    example: 'Portable Oxygen Concentrator',
    description: 'Name of the healthcare equipment product',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example:
      'High-quality portable oxygen concentrator with 2-hour battery life',
    description: 'Detailed description of the product',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: 499.99,
    description: 'Price of the product in USD',
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    example: 50,
    description: 'Available stock quantity',
  })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({
    enum: PRODUCT_SIZES,
    example: 'M',
    description: 'Product size label',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(PRODUCT_SIZES)
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';

  @ApiProperty({
    example: 2.5,
    description: 'Product weight in kilograms (0.01 to 50 kg)',
  })
  @Transform(({ value }) =>
    value === '' || value == null ? value : Number(value),
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(50)
  weight: number;

  @ApiPropertyOptional({
    example: 'Blue',
    description: 'Product color',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Category ID (UUID)',
  })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    example: [
      'https://example.com/image-1.jpg',
      'https://example.com/image-2.jpg',
    ],
    description: 'Optional image URLs for the product',
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Supports multipart text input like '["url1","url2"]'
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return [value];
        }
      }

      // Supports single URL string input
      return [value];
    }

    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrl?: string[];
}
