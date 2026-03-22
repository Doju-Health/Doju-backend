import { ApiProperty } from '@nestjs/swagger';
import { AdminUserResponseDto } from './admin-user-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 6, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: 55, description: 'Total number of items' })
  total: number;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({
    type: [AdminUserResponseDto],
    description: 'Current page users list',
  })
  data: AdminUserResponseDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta: PaginationMetaDto;
}
