import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private waitlistRepo: Repository<WaitlistEntry>,
    private emailService: EmailService,
  ) {}

  async joinWaitlist(email: string) {
    const existing = await this.waitlistRepo.findOne({ where: { email } });

    if (existing) {
      throw new BadRequestException('Email already on waitlist');
    }

    const entry = this.waitlistRepo.create({ email });
    await this.waitlistRepo.save(entry);

    await this.emailService.sendWaitlistWelcomeEmail(email);

    return {
      message: 'You have been added to the waitlist',
      email: entry.email,
      joinedAt: entry.createdAt,
    };
  }
}
