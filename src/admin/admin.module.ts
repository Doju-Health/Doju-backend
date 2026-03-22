import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product-entity';
import { Order } from 'src/orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Order])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
