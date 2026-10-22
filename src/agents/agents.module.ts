import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from './entities/agent.entity';
import { User } from 'src/users/entities/user.entity';
import { EmailModule } from 'src/email/email.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, User]), EmailModule, CommonModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
