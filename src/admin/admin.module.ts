import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product-entity';
import { Order } from 'src/orders/entities/order.entity';
import { ProductCategory } from 'src/products/entities/product-category.entity';
import { Payment } from 'src/payment/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Order, ProductCategory, Payment])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
