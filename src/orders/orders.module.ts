import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Product } from 'src/products/entities/product-entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CommonModule } from 'src/common/common.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    TypeOrmModule.forFeature([Order, Product]),
    CommonModule,
    EmailModule,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
