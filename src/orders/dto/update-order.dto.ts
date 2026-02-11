import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../enums/order.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiPropertyOptional({
    example: 'confirmed',
    description:
      'Order status (pending, confirmed, shipped, delivered, cancelled)',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @ApiPropertyOptional({
    example: 'paid',
    description: 'Payment status (pending, paid, failed, refunded)',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
