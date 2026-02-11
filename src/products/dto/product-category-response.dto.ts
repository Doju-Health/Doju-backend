import { ApiProperty } from '@nestjs/swagger';

export class ProductCategoryResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique category identifier',
  })
  id: string;

  @ApiProperty({
    example: 'Diagnostics',
    description: 'Category name',
  })
  name: string;

  @ApiProperty({
    example: 'Diagnostic equipment including blood pressure monitors, thermometers, etc.',
    description: 'Category description',
  })
  description: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/doju/image/upload/v1234567890/doju/categories/diagnostics.jpg',
    description: 'Category image URL from Cloudinary',
    nullable: true,
  })
  imageUrl?: string;

  @ApiProperty({
    example: true,
    description: 'Category active status',
  })
  isActive: boolean;

  @ApiProperty({
    example: '2025-02-09T10:30:00Z',
    description: 'Category creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-02-09T10:30:00Z',
    description: 'Category last update timestamp',
  })
  updatedAt: Date;
}
