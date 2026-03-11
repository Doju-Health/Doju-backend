import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 57, description: 'Total number of matching orders' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Number of orders per page' })
  limit: number;

  @ApiProperty({ example: 6, description: 'Total number of pages' })
  totalPages: number;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({
    type: [OrderResponseDto],
    description: 'Current page order list',
  })
  data: OrderResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta: PaginationMetaDto;
}
