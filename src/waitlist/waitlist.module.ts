import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../email/email.module';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { WaitlistEntry } from './entities/waitlist-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WaitlistEntry]), EmailModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
