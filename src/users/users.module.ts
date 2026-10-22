import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { CommonModule } from 'src/common/common.module';
import { PaymentsModule } from 'src/payment/payment.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CommonModule,
    PaymentsModule,
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
