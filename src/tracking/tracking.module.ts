import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { OrderTrackingService } from './tracking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderTracking } from './entities/tracking.entity';
import { Order } from 'src/orders/entities/order.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([OrderTracking, Order]),
  ],
  controllers: [TrackingController],
  providers: [OrderTrackingService],
  exports: [OrderTrackingService],
})
export class TrackingModule {}
