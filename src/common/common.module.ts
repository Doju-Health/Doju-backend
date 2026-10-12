import { Module } from '@nestjs/common';
import { CloudinaryService } from './services/cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';
import { DeliveryZoneService } from './services/delivery-zone.service';
import { DeliveryRateCardService } from './services/delivery-rate-card.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from 'src/agents/entities/agent.entity';
import { Ambassador } from 'src/ambassadors/entities/ambassador.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, Ambassador])],
  controllers: [CloudinaryController],
  providers: [CloudinaryService, DeliveryZoneService, DeliveryRateCardService],
  exports: [CloudinaryService, DeliveryZoneService, DeliveryRateCardService],
})
export class CommonModule {}
