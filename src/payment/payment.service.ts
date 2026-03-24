import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Order } from 'src/orders/entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { PaymentStatus, OrderStatus } from 'src/orders/enums/order.enum';
import { InitiatePaymentDto } from './dto/payment.dto';
import { EscrowStatus } from './entities/payment.entity';
import { UserRole } from 'src/users/enums/user.enum';

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
    if (!dto.orderId && !dto.bulkOrderId) {
      throw new BadRequestException('orderId or bulkOrderId is required');
    }

    let order: Order | null = null;
    let orders: Order[] = [];
    let totalAmount = 0;
    let bulkOrderId: string | undefined;

    if (dto.bulkOrderId) {
      orders = await this.orderRepo.find({
        where: { bulkOrderId: dto.bulkOrderId },
        relations: ['buyer', 'product', 'product.seller'],
        order: { createdAt: 'DESC' },
      });

      if (orders.length === 0) {
        throw new NotFoundException('Bulk order not found');
      }

      // Verify buyer owns all orders
      const invalidOrder = orders.find((o) => o.buyer.id !== buyer.id);
      if (invalidOrder) {
        throw new BadRequestException('You can only pay for your own orders');
      }

      // Check status for any order in the bulk group
      const paidOrder = orders.find((o) => o.paymentStatus === PaymentStatus.PAID);
      if (paidOrder) {
        throw new BadRequestException('One or more orders have already been paid');
      }

      const cancelledOrder = orders.find((o) => o.orderStatus === OrderStatus.CANCELLED);
      if (cancelledOrder) {
        throw new BadRequestException('Cannot pay for cancelled order');
      }

      totalAmount = orders.reduce(
        (sum, o) => sum + Number(o.totalPrice),
        0,
      );
      bulkOrderId = dto.bulkOrderId;
      order = orders[0];
    } else if (dto.orderId) {
      order = await this.orderRepo.findOne({
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

      totalAmount = Number(order.totalPrice);
      orders = [order];
    }

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    try {
      const response = await axios.post<any>(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email: buyer.email,
          amount: Math.round(totalAmount * 100), // Paystack expects amount in kobo (smallest currency unit)
          currency: 'NGN', // Change based on your currency
          reference: this.generateReference(),
          callback_url: dto.callbackUrl,
          metadata: {
            orderId: order?.id,
            bulkOrderId,
            orderIds: orders.map((o) => o.id),
            buyerId: buyer.id,
            productId: order?.product?.id,
            sellerId: order?.product?.seller?.id,
            custom_fields: [
              {
                display_name: 'Order ID',
                variable_name: 'order_id',
                value: order?.id ?? '',
              },
              ...(bulkOrderId
                ? [
                    {
                      display_name: 'Bulk Order ID',
                      variable_name: 'bulk_order_id',
                      value: bulkOrderId,
                    },
                  ]
                : []),
              {
                display_name: 'Product',
                variable_name: 'product_name',
                value: order?.product?.name ?? '',
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
        amount: totalAmount,
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

  async getTransactions({
    page = 1,
    limit = 10,
    role,
    userId,
    status,
    escrowStatus,
    provider,
  }: {
    page?: number;
    limit?: number;
    role?: UserRole;
    userId?: string;
    status?: PaymentStatus;
    escrowStatus?: EscrowStatus;
    provider?: string;
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('payment.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller');

    if (status) {
      qb.andWhere('payment.status = :status', { status });
    }

    if (escrowStatus) {
      qb.andWhere('payment.escrowStatus = :escrowStatus', { escrowStatus });
    }

    if (provider) {
      qb.andWhere('payment.provider = :provider', { provider });
    }

    if (role && userId) {
      if (role === UserRole.BUYER) {
        qb.andWhere('buyer.id = :userId', { userId });
      } else if (role === UserRole.SELLER) {
        qb.andWhere('seller.id = :userId', { userId });
      }
    } else if (userId) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb.where('buyer.id = :userId', { userId }).orWhere('seller.id = :userId', { userId });
        }),
      );
    }

    const [data, total] = await qb
      .orderBy('payment.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getMyTransactions({
    user,
    page = 1,
    limit = 10,
    status,
    escrowStatus,
    provider,
  }: {
    user: User;
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    escrowStatus?: EscrowStatus;
    provider?: string;
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('payment.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller');

    if (user.role === UserRole.SELLER) {
      qb.where('seller.id = :userId', { userId: user.id });
    } else if (user.role === UserRole.BUYER) {
      qb.where('buyer.id = :userId', { userId: user.id });
    }

    if (status) {
      qb.andWhere('payment.status = :status', { status });
    }

    if (escrowStatus) {
      qb.andWhere('payment.escrowStatus = :escrowStatus', { escrowStatus });
    }

    if (provider) {
      qb.andWhere('payment.provider = :provider', { provider });
    }

    const [data, total] = await qb
      .orderBy('payment.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
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

        const bulkOrderId = metadata?.bulkOrderId;
        if (bulkOrderId) {
          const bulkOrders = await this.orderRepo.find({
            where: { bulkOrderId },
          });

          if (bulkOrders.length === 0) {
            throw new NotFoundException('Bulk order not found');
          }

          for (const order of bulkOrders) {
            order.paymentStatus = PaymentStatus.PAID;
            order.orderStatus = OrderStatus.CONFIRMED;
            order.transactionId = reference;
          }

          await this.orderRepo.save(bulkOrders);
        } else {
          // Update order status
          payment.order.paymentStatus = PaymentStatus.PAID;
          payment.order.orderStatus = OrderStatus.CONFIRMED;
          payment.order.transactionId = reference;

          await this.orderRepo.save(payment.order);
        }
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
  async confirmDeliveryAndRelease(
    orderId: string | undefined,
    buyer: User,
    bulkOrderId?: string,
  ) {
    const { payment, orders } = await this.getPaymentAndOrders({
      orderId,
      bulkOrderId,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify buyer owns all orders
    const invalidOrder = orders.find((o) => o.buyer.id !== buyer.id);
    if (invalidOrder) {
      throw new BadRequestException('You can only confirm your own orders');
    }

    // Check if payment is in escrow
    if (payment.escrowStatus !== 'HELD') {
      throw new BadRequestException('Payment is not in escrow');
    }

    //  if (payment.escrowStatus === 'RELEASED') {
    //   throw new BadRequestException('Payment has already been released to seller');
    // }

    // Check if all orders are delivered
    const notDelivered = orders.find(
      (o) => o.orderStatus !== OrderStatus.DELIVERED,
    );
    if (notDelivered) {
      throw new BadRequestException(
        'Order must be delivered before releasing payment',
      );
    }

    // Release escrow
    payment.escrowStatus = EscrowStatus.RELEASED;
    payment.escrowReleasedAt = new Date();
    orders.forEach((o) => {
      o.orderStatus = OrderStatus.COMPLETED;
    });

    await this.paymentRepo.save(payment);
    await this.orderRepo.save(orders);

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
      .andWhere('payment.escrowHeldAt <= :cutoffDate', { cutoffDate })
      .getMany();

    let releasedCount = 0;

    for (const payment of paymentsToRelease) {
      const bulkOrderId = payment.paystackResponse?.metadata?.bulkOrderId;
      let orders: Order[] = [payment.order];

      if (bulkOrderId) {
        orders = await this.orderRepo.find({ where: { bulkOrderId } });
      }

      const allDelivered = orders.every(
        (o) => o.orderStatus === OrderStatus.DELIVERED,
      );
      if (!allDelivered) {
        continue;
      }

      payment.escrowStatus = EscrowStatus.RELEASED;
      payment.escrowReleasedAt = new Date();

      orders.forEach((o) => {
        o.orderStatus = OrderStatus.COMPLETED;
      });

      await this.paymentRepo.save(payment);
      await this.orderRepo.save(orders);
      await this.transferToSeller(payment);
      releasedCount += 1;
    }

    return releasedCount;
  }

  /**
   * Handle refund (if order is cancelled before delivery)
   */
  async refundPayment(orderId?: string, bulkOrderId?: string) {
    const { payment, orders } = await this.getPaymentAndOrders({
      orderId,
      bulkOrderId,
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
      orders.forEach((o) => {
        o.paymentStatus = PaymentStatus.REFUNDED;
      });

      await this.paymentRepo.save(payment);
      await this.orderRepo.save(orders);

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
  async getPaymentByOrder(orderId?: string, bulkOrderId?: string) {
    const payment = await this.getPaymentByOrderOrBulk(orderId, bulkOrderId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Generate unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `MED-${timestamp}-${random}`;
  }

  private async getPaymentByOrderOrBulk(
    orderId?: string,
    bulkOrderId?: string,
  ) {
    if (bulkOrderId) {
      return this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.order', 'order')
        .leftJoinAndSelect('payment.buyer', 'buyer')
        .where('order.bulkOrderId = :bulkOrderId', { bulkOrderId })
        .getOne();
    }

    if (orderId) {
      return this.paymentRepo.findOne({
        where: { order: { id: orderId } },
        relations: ['order', 'buyer'],
      });
    }

    return null;
  }

  private async getPaymentAndOrders({
    orderId,
    bulkOrderId,
  }: {
    orderId?: string;
    bulkOrderId?: string;
  }) {
    if (!orderId && !bulkOrderId) {
      throw new BadRequestException('orderId or bulkOrderId is required');
    }

    if (bulkOrderId) {
      const orders = await this.orderRepo.find({
        where: { bulkOrderId },
        relations: ['buyer', 'product', 'product.seller'],
        order: { createdAt: 'DESC' },
      });

      if (orders.length === 0) {
        throw new NotFoundException('Bulk order not found');
      }

      const payment = await this.getPaymentByOrderOrBulk(undefined, bulkOrderId);
      return { payment, orders };
    }

    const orders = await this.orderRepo.find({
      where: { id: orderId },
      relations: ['buyer', 'product', 'product.seller'],
    });

    if (orders.length === 0) {
      throw new NotFoundException('Order not found');
    }

    const payment = await this.getPaymentByOrderOrBulk(orderId);
    return { payment, orders };
  }
}
