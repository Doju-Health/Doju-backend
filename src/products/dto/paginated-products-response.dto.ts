import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 57, description: 'Total number of matching products' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of products per page' })
  limit: number;

  @ApiProperty({ example: 6, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({
    type: [ProductResponseDto],
    description: 'Current page product list',
  })
  data: ProductResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta: PaginationMetaDto;
}
