import { Module } from '@nestjs/common';
import { CloudinaryService } from './services/cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';
import { DeliveryZoneService } from './services/delivery-zone.service';
import { DeliveryRateCardService } from './services/delivery-rate-card.service';

@Module({
  controllers: [CloudinaryController],
  providers: [CloudinaryService, DeliveryZoneService, DeliveryRateCardService],
  exports: [CloudinaryService, DeliveryZoneService, DeliveryRateCardService],
})
export class CommonModule {}
