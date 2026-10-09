import { Module } from '@nestjs/common';
import { AmbassadorsService } from './ambassadors.service';
import { AmbassadorsController } from './ambassadors.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ambassador } from './entities/ambassador.entity';
import { User } from 'src/users/entities/user.entity';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ambassador, User]), EmailModule],
  controllers: [AmbassadorsController],
  providers: [AmbassadorsService],
})
export class AmbassadorsModule {}
