import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PaymentsService } from "src/payment/payment.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EscrowCronService {
  private readonly logger = new Logger(EscrowCronService.name);

  constructor(
    private readonly paymentService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run daily at 2 AM to check and release escrow payments
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleEscrowAutoRelease() {
    this.logger.log('Starting automatic escrow release job...');

    try {
      const days = this.configService.get<number>('AUTO_RELEASE_DAYS', 7);
      const releasedCount = await this.paymentService.autoReleaseEscrow(days);

      this.logger.log(
        `Automatic escrow release completed. Released ${releasedCount} payments.`,
      );
    } catch (error) {
      this.logger.error('Error during automatic escrow release:', error);
    }
  }

  /**
   * Optional: Run every hour to check for payments that need attention
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkPendingPayments() {
    this.logger.log('Checking pending payments...');
    // Add logic to notify about stuck payments, etc.
  }
}
