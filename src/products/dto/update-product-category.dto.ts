import { PartialType } from '@nestjs/mapped-types';
import { CreateProductCategoryDto } from './create-product-category.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductCategoryDto extends PartialType(
  CreateProductCategoryDto,
) {
  @ApiPropertyOptional({
    example: 'Updated Diagnostics',
    description: 'Updated category name',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated category description',
    description: 'Updated category description',
  })
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-image.jpg',
    description: 'Updated category image URL',
  })
  imageUrl?: string;
}
