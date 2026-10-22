import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryProvider, OrderStatus, PaymentStatus } from '../enums/order.enum';

export class OrderResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique order identifier',
  })
  id: string;

  @ApiProperty({
    example: {
      id: 'buyer-123',
      fullName: 'John Doe',
      email: 'john@example.com',
    },
    description: 'Buyer information',
  })
  buyer: {
    id: string;
    fullName: string;
    email: string;
  };

  @ApiProperty({
    example: {
      id: 'product-123',
      name: 'Portable Oxygen Concentrator',
      price: 499.99,
      imageUrl: ['https://example.com/image-1.jpg'],
    },
    description: 'Product information',
  })
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string[];
  };

  @ApiProperty({
    example: 5,
    description: 'Order quantity',
  })
  quantity: number;

  @ApiProperty({
    example: 499.99,
    description: 'Unit price at time of order',
  })
  unitPrice: number;

  @ApiProperty({
    example: 2499.95,
    description: 'Total price (unitPrice × quantity)',
  })
  totalPrice: number;

  @ApiPropertyOptional({ example: 27300, description: 'Payable total using Chowdeck delivery', nullable: true })
  chowdeckTotalPrice?: number | null;

  @ApiPropertyOptional({ enum: DeliveryProvider, nullable: true })
  deliveryProvider?: DeliveryProvider | null;

  @ApiProperty({
    example: 3500,
    description: 'Delivery fee charged for this order',
    nullable: true,
  })
  deliveryFee?: number | null;

  @ApiPropertyOptional({ example: 190000, description: 'Chowdeck delivery amount returned by its fee endpoint', nullable: true })
  chowdeckDeliveryAmount?: number | null;

  @ApiPropertyOptional({ example: 259497441, description: 'Chowdeck fee quote ID', nullable: true })
  chowdeckFeeId?: number | null;

  @ApiPropertyOptional({ example: 98765, nullable: true })
  chowdeckDeliveryId?: number | null;

  @ApiPropertyOptional({ example: 'my-delivery-ref-001', nullable: true })
  chowdeckReference?: string | null;

  @ApiPropertyOptional({ example: 'preparing', nullable: true })
  chowdeckDeliveryStatus?: string | null;

  @ApiPropertyOptional({ example: 'https://track.chowdeck.com/my-delivery-ref-001', nullable: true })
  chowdeckTrackingUrl?: string | null;

  @ApiPropertyOptional({ example: '4821', nullable: true })
  chowdeckDeliveryPin?: string | null;

  @ApiProperty({
    example: null,
    description: 'Platform fee deducted from the payout',
    nullable: true,
  })
  platformFee?: number | null;

  @ApiProperty({
    example: null,
    description: 'Amount the seller receives after deductions',
    nullable: true,
  })
  sellerAmount?: number | null;

  @ApiPropertyOptional({
    example: 14600,
    description: 'Total payout to the seller, including the actual delivery fee',
    nullable: true,
  })
  sellerReceives?: number | null;

  @ApiProperty({
    example: 300,
    description: 'Estimated platform fee before payout settlement',
    nullable: true,
  })
  estimatedPlatformFee?: number | null;

  @ApiProperty({
    example: 2200,
    description: 'Estimated seller amount before payout settlement',
    nullable: true,
  })
  estimatedSellerAmount?: number | null;

  @ApiPropertyOptional({
    example: 'bulk-123e4567-e89b-12d3-a456-426614174000',
    description: 'Shared order identifier for bulk purchases',
  })
  bulkOrderId?: string;

  @ApiProperty({
    example: 'pending',
    description: 'Order status',
    enum: OrderStatus,
  })
  orderStatus: OrderStatus;

  @ApiProperty({
    example: 'pending',
    description: 'Payment status',
    enum: PaymentStatus,
  })
  paymentStatus: PaymentStatus;

  @ApiProperty({
    example: '123 Main Street, New York, NY 10001',
    description: 'Delivery address',
    nullable: true,
  })
  deliveryAddress?: string;

  @ApiProperty({
    example: 'Please handle with care',
    description: 'Order notes',
    nullable: true,
  })
  notes?: string;

  @ApiProperty({
    example: 'TXN-1234567890',
    description: 'Payment transaction ID',
    nullable: true,
  })
  transactionId?: string;

  @ApiProperty({
    example: '2025-02-10T10:30:00Z',
    description: 'Order creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-02-10T10:30:00Z',
    description: 'Order last update timestamp',
  })
  updatedAt: Date;
}
