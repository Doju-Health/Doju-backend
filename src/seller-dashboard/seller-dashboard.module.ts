import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerDashboardService } from './seller-dashboard.service';
import { SellerDashboardController } from './seller-dashboard.controller';
import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product-entity';
import { Payment } from 'src/payment/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order, Payment]),
  ],
  controllers: [SellerDashboardController],
  providers: [SellerDashboardService],
  exports: [SellerDashboardService],
})
export class SellerDashboardModule {}