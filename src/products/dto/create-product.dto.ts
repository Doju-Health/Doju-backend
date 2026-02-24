import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrl?: string[];
}
