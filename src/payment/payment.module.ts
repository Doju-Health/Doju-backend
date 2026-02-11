import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { Order } from 'src/orders/entities/order.entity';
import { PaymentsService } from './payment.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
    ConfigModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],

})
export class PaymentsModule {}
