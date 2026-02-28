import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Order } from 'src/orders/entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { PaymentStatus, OrderStatus } from 'src/orders/enums/order.enum';
import { InitiatePaymentDto } from './dto/payment.dto';
import { EscrowStatus } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private configService: ConfigService,
  ) {
    this.paystackSecretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') ?? '';
  }

  // Initialize payment with Paystack

  async initiatePayment(dto: InitiatePaymentDto, buyer: User) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: ['buyer', 'product', 'product.seller'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify buyer owns this order
    if (order.buyer.id !== buyer.id) {
      throw new BadRequestException('You can only pay for your own orders');
    }

    // Check if order is already paid
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order has already been paid');
    }

    // Check if order is cancelled
    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for cancelled order');
    }

    try {
      const response = await axios.post<any>(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email: buyer.email,
          amount: Math.round(order.totalPrice * 100), // Paystack expects amount in kobo (smallest currency unit)
          currency: 'NGN', // Change based on your currency
          reference: this.generateReference(),
          callback_url: dto.callbackUrl,
          metadata: {
            orderId: order.id,
            buyerId: buyer.id,
            productId: order.product.id,
            sellerId: order.product.seller.id,
            custom_fields: [
              {
                display_name: 'Order ID',
                variable_name: 'order_id',
                value: order.id,
              },
              {
                display_name: 'Product',
                variable_name: 'product_name',
                value: order.product.name,
              },
            ],
          },
          channels: ['card', 'bank', 'ussd', 'mobile_money'], // Payment channels to enable
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { authorization_url, access_code, reference } = response.data.data;

      // Create payment record in escrow status
      const payment = this.paymentRepo.create({
        order,
        buyer,
        amount: order.totalPrice,
        reference,
        accessCode: access_code,
        status: PaymentStatus.PENDING,
        escrowStatus: EscrowStatus.HELD, // Money will be held in escrow
        provider: 'PAYSTACK',
      });

      await this.paymentRepo.save(payment);

      return {
        authorizationUrl: authorization_url,
        accessCode: access_code,
        reference,
      };
    } catch (error) {
      console.error(
        'Paystack initialization error:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Failed to initialize payment. Please try again.',
      );
    }
  }

  /**
   * Verify Paystack payment and update escrow status
   */
  async verifyPayment(reference: string) {
    try {
      // Verify with Paystack
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      const { status, amount, metadata, paid_at, channel } = response.data.data;

      // Find payment record
      const payment = await this.paymentRepo.findOne({
        where: { reference },
        relations: ['order', 'order.product', 'order.product.seller'],
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }

      // Update payment record
      payment.status =
        status === 'success' ? PaymentStatus.PAID : PaymentStatus.FAILED;
      if (paid_at) payment.paidAt = new Date(paid_at);
      payment.channel = channel;
      payment.paystackResponse = response.data.data;

      if (status === 'success') {
        // Keep money in escrow until delivery is confirmed
        payment.escrowStatus = EscrowStatus.HELD;
        payment.escrowHeldAt = new Date();

        // Update order status
        payment.order.paymentStatus = PaymentStatus.PAID;
        payment.order.orderStatus = OrderStatus.CONFIRMED;
        payment.order.transactionId = reference;

        await this.orderRepo.save(payment.order);
      }

      await this.paymentRepo.save(payment);

      return payment;
    } catch (error) {
      console.error(
        'Payment verification error:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  /**
   * Handle Paystack webhook (for automatic payment notifications)
   */
  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const hash = require('crypto')
      .createHmac('sha512', this.paystackSecretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== signature) {
      throw new BadRequestException('Invalid signature');
    }

    const { event, data } = payload;

    if (event === 'charge.success') {
      await this.verifyPayment(data.reference);
    }

    return { status: 'success' };
  }

  /**
   * Confirm delivery and release escrow to seller
   */
  async confirmDeliveryAndRelease(orderId: string, buyer: User) {
    const payment = await this.paymentRepo.findOne({
      where: { order: { id: orderId } },
      relations: [
        'order',
        'order.buyer',
        'order.product',
        'order.product.seller',
      ],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify buyer owns this order
    if (payment.order.buyer.id !== buyer.id) {
      throw new BadRequestException('You can only confirm your own orders');
    }

    // Check if payment is in escrow
    if (payment.escrowStatus !== 'HELD') {
      throw new BadRequestException('Payment is not in escrow');
    }

    // Check if order is delivered
    if (payment.order.orderStatus !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Order must be delivered before releasing payment',
      );
    }

    // Release escrow
    payment.escrowStatus = EscrowStatus.RELEASED;
    payment.escrowReleasedAt = new Date();
    payment.order.orderStatus = OrderStatus.COMPLETED;

    await this.paymentRepo.save(payment);
    await this.orderRepo.save(payment.order);

    // Here you would typically transfer funds to seller's account
    // This could be done via Paystack Transfer API or your own logic
    await this.transferToSeller(payment);

    return payment;
  }

  /**
   * Auto-release escrow after specified days if no dispute
   */
  async autoReleaseEscrow(days: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const paymentsToRelease = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('payment.escrowStatus = :status', { status: 'HELD' })
      .andWhere('order.orderStatus = :orderStatus', {
        orderStatus: OrderStatus.DELIVERED,
      })
      .andWhere('payment.escrowHeldAt <= :cutoffDate', { cutoffDate })
      .getMany();

    for (const payment of paymentsToRelease) {
      payment.escrowStatus = EscrowStatus.RELEASED;
      payment.escrowReleasedAt = new Date();
      payment.order.orderStatus = OrderStatus.COMPLETED;

      await this.paymentRepo.save(payment);
      await this.orderRepo.save(payment.order);
      await this.transferToSeller(payment);
    }

    return paymentsToRelease.length;
  }

  /**
   * Handle refund (if order is cancelled before delivery)
   */
  async refundPayment(orderId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { order: { id: orderId } },
      relations: ['order', 'buyer'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    if (payment.escrowStatus === 'RELEASED') {
      throw new BadRequestException(
        'Cannot refund - payment already released to seller',
      );
    }

    try {
      // Initiate refund via Paystack
      const response = await axios.post(
        `${this.paystackBaseUrl}/refund`,
        {
          transaction: payment.reference,
          amount: Math.round(payment.amount * 100), // Full refund
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Update payment status
      payment.status = PaymentStatus.REFUNDED;
      payment.escrowStatus = EscrowStatus.REFUNDED;
      payment.refundedAt = new Date();
      payment.order.paymentStatus = PaymentStatus.REFUNDED;

      await this.paymentRepo.save(payment);
      await this.orderRepo.save(payment.order);

      return payment;
    } catch (error) {
      console.error('Refund error:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  /**
   * Transfer funds to seller (via Paystack Transfer API)
   */
  private async transferToSeller(payment: Payment) {
    // First, create transfer recipient if not exists
    const seller = payment.order.product.seller;

    try {
      // You'll need to store seller's bank details in your User entity
      // This is a simplified example
      const transferResponse = await axios.post<any>(
        `${this.paystackBaseUrl}/transfer`,
        {
          source: 'balance',
          amount: Math.round(payment.amount * 100),
          recipient: seller.paystackRecipientCode ?? '', // You need to create and store this
          reason: `Payment for order ${payment.order.id}`,
          reference: `PAYOUT-${payment.reference}`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Log the transfer
      payment.transferReference = transferResponse.data.data.reference;
      payment.transferredAt = new Date();
      await this.paymentRepo.save(payment);

      return transferResponse.data;
    } catch (error) {
      console.error('Transfer error:', error.response?.data || error.message);
      // Log error but don't throw - payment is still released, transfer can be retried
    }
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrder(orderId: string) {
    return this.paymentRepo.findOne({
      where: { order: { id: orderId } },
      relations: ['order', 'buyer'],
    });
  }

  /**
   * Generate unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `MED-${timestamp}-${random}`;
  }
}
