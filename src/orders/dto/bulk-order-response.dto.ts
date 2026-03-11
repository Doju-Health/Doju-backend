import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class BulkOrderResponseDto {
  @ApiProperty({
    example: 'bulk-123e4567-e89b-12d3-a456-426614174000',
    description: 'Shared order identifier for all orders created in the bulk request',
  })
  orderId: string;

  @ApiProperty({
    example: 2499.95,
    description: 'Total price for all orders in the bulk request',
  })
  totalPrice: number;

  @ApiProperty({
    type: [OrderResponseDto],
    description: 'Orders created in this bulk request',
  })
  orders: OrderResponseDto[];
}
