import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product-entity';
import { PaymentsService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { PaymentScheduler } from './payment.schedular';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, Product]),
    ConfigModule,
    EmailModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentScheduler],
  exports: [PaymentsService],

})
export class PaymentsModule {}
