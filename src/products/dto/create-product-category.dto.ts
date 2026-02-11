import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({
    example: 'Diagnostics',
    description: 'Category name (e.g., Diagnostics, Mobility Aids, etc.)',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Diagnostic equipment including blood pressure monitors, thermometers, etc.',
    description: 'Detailed description of the category',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: 'https://example.com/diagnostics-category.jpg',
    description: 'Optional category image URL',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
