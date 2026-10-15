import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';
import { DeliveryProvider } from '../enums/order.enum';

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

  @ApiProperty({ example: 2499.95, description: 'Combined payable total using Chowdeck delivery' })
  chowdeckTotalPrice: number;

  @ApiProperty({
    example: 3500,
    description: 'Combined delivery fee for all items in the bulk request',
  })
  bulkDeliveryFee: number;

  @ApiProperty({ example: 1800, description: 'Combined Chowdeck delivery amount for all orders' })
  chowdeckBulkDeliveryFee: number;

  @ApiPropertyOptional({ enum: DeliveryProvider, nullable: true })
  deliveryProvider?: DeliveryProvider | null;

  @ApiProperty({
    example: 300,
    description: 'Combined estimated platform fee for the bulk request',
  })
  bulkEstimatedPlatformFee: number;

  @ApiProperty({
    example: 2200,
    description: 'Combined estimated seller amount for the bulk request',
  })
  bulkEstimatedSellerAmount: number;

  @ApiProperty({
    type: [OrderResponseDto],
    description: 'Orders created in this bulk request',
  })
  orders: OrderResponseDto[];
}
