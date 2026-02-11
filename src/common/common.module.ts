import { Module } from '@nestjs/common';
import { CloudinaryService } from './services/cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';

@Module({
  controllers: [CloudinaryController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CommonModule {}
