// payment.scheduler.ts
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payment.service';
import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator';

@Injectable()
export class PaymentScheduler {
  constructor(private paymentsService: PaymentsService) {}

  @Cron('0 0,12 * * *') // Twice daily: midnight and noon
  async processPendingTransfers() {
    await this.paymentsService.retryPendingTransfers();
  }
}
