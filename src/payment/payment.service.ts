import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, IsNull } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Order } from 'src/orders/entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { PaymentStatus, OrderStatus } from 'src/orders/enums/order.enum';
import { InitiatePaymentDto } from './dto/payment.dto';
import { EscrowStatus } from './entities/payment.entity';
import { UserRole } from 'src/users/enums/user.enum';
import * as crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Injectable()
export class PaymentsService {
  private readonly flwSecretKey: string;
  private readonly flwWebhookHash: string;
  private readonly flwBaseUrl = 'https://api.flutterwave.com/v3';

  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    private configService: ConfigService,
  ) {
    this.flwSecretKey = this.configService.get<string>('FLW_SECRET_KEY') ?? '';
    this.flwWebhookHash =
      this.configService.get<string>('FLW_WEBHOOK_HASH') ?? '';
  }

  // Initialize payment with Flutterwave

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
      const paidOrder = orders.find(
        (o) => o.paymentStatus === PaymentStatus.PAID,
      );
      if (paidOrder) {
        throw new BadRequestException(
          'One or more orders have already been paid',
        );
      }

      const cancelledOrder = orders.find(
        (o) => o.orderStatus === OrderStatus.CANCELLED,
      );
      if (cancelledOrder) {
        throw new BadRequestException('Cannot pay for cancelled order');
      }

      totalAmount = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
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

    const reference = this.generateReference();

    try {
      const response = await axios.post<any>(
        `${this.flwBaseUrl}/payments`,
        {
          tx_ref: reference,
          amount: totalAmount, // ✅ Flutterwave uses naira directly, no * 100
          currency: 'NGN',
          redirect_url: dto.callbackUrl,
          customer: {
            email: buyer.email,
            name: `${buyer.fullName ?? ''}`.trim() || buyer.email.split('@')[0],
            phonenumber: buyer.phoneNumber ?? undefined,
          },
          // meta: {
          //   orderId: order?.id,
          //   bulkOrderId,
          //   orderIds: orders.map((o) => o.id),
          //   buyerId: buyer.id,
          //   productId: order?.product?.id,
          //   sellerId: order?.product?.seller?.id,
          // },
          meta: {
  orderId: order?.id ?? '',
  bulkOrderId: bulkOrderId ?? '',
  orderIds: orders.map((o) => o.id).join(','),  // ✅ array → comma-separated string
  buyerId: buyer.id ?? '',
  productId: order?.product?.id ?? '',
  sellerId: order?.product?.seller?.id ?? '',
},
          customizations: {
            title: 'MedEquip Marketplace',
            description: order?.product?.name
              ? `Payment for ${order.product.name}`
              : 'Medical Equipment Purchase',
          },
          payment_options: 'card,banktransfer,ussd,mobilemoney',
        },
        {
          headers: {
            Authorization: `Bearer ${this.flwSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { link } = response.data.data;

      // Create payment record in escrow status
      const payment = this.paymentRepo.create({
        order,
        buyer,
        amount: totalAmount,
        reference,
        status: PaymentStatus.PENDING,
        escrowStatus: EscrowStatus.HELD,
        provider: 'FLUTTERWAVE',
      });

      await this.paymentRepo.save(payment);

      return {
        authorizationUrl: link,
        reference,
      };
    } catch (error) {
      console.error(
        'Flutterwave initialization error:',
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
          subQb
            .where('buyer.id = :userId', { userId })
            .orWhere('seller.id = :userId', { userId });
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
   * Verify Flutterwave payment and update escrow status
   */
  async verifyPayment(transactionId: string) {
    try {
      // Verify with Flutterwave
      const response = await axios.get(
        `${this.flwBaseUrl}/transactions/${transactionId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.flwSecretKey}`,
          },
        },
      );

      const { status, amount, meta, charged_amount, payment_type, created_at } =
        response.data.data;

      // tx_ref is your internal reference stored on the payment record
      const tx_ref: string = response.data.data.tx_ref;
      // Find payment record
      const payment = await this.paymentRepo.findOne({
        where: { reference: tx_ref },
        relations: ['order', 'order.product', 'order.product.seller'],
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }

       if (payment.status === PaymentStatus.PAID) {
    return payment; // already handled, skip
  }
      // Update payment record
      payment.status =
        status === 'successful' ? PaymentStatus.PAID : PaymentStatus.FAILED;

      if (created_at) payment.paidAt = new Date(created_at);
      payment.channel = payment_type;
      payment.flutterwaveResponse = response.data.data; // rename this field to `providerResponse` in entity ideally

      if (status === 'successful') {
        payment.escrowStatus = EscrowStatus.HELD;
        payment.escrowHeldAt = new Date();

        const bulkOrderId = meta?.bulkOrderId;

        if (bulkOrderId) {
          const bulkOrders = await this.orderRepo.find({
            where: { bulkOrderId },
          });
          if (bulkOrders.length === 0)
            throw new NotFoundException('Bulk order not found');

          for (const order of bulkOrders) {
            order.paymentStatus = PaymentStatus.PAID;
            order.orderStatus = OrderStatus.CONFIRMED;
            order.transactionId = tx_ref;
          }

          await this.orderRepo.save(bulkOrders);
        } else {
          payment.order.paymentStatus = PaymentStatus.PAID;
          payment.order.orderStatus = OrderStatus.CONFIRMED;
          payment.order.transactionId = tx_ref;

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
   * Handle Flutterwave webhook (for automatic payment notifications)
   */
  async handleWebhook(payload: any, signature: string) {
    if (!signature || signature !== this.flwWebhookHash) {
      throw new BadRequestException('Invalid signature');
    }

    const { event, data } = payload;

    switch (event) {
      case 'charge.completed':
        if (data.status === 'successful') {
          await this.verifyPayment(String(data.id));
        }
        break;

      case 'transfer.completed':
        await this.handleTransferWebhook(data);
        break;
    }

    return { status: 'success' };
  }

  private async handleTransferWebhook(data: any) {
    // data.reference is the PAYOUT-xxx ref you set
    const payment = await this.paymentRepo.findOne({
      where: { transferReference: data.reference },
      relations: ['order'],
    });

    if (!payment) {
      console.error(`No payment found for transfer ref: ${data.reference}`);
      return;
    }

    if (data.status === 'SUCCESSFUL') {
      // Transfer confirmed — nothing extra needed, already marked transferredAt
      console.log(`Payout confirmed for order ${payment.order.id}`);
    } else if (data.status === 'FAILED') {
      // Optionally: flag for manual retry, notify admin
      console.error(
        `Payout FAILED for order ${payment.order.id} — ref: ${data.reference}`,
      );
      payment.transferReference = null; // clear so retry logic can re-attempt
      payment.transferredAt = null;
      await this.paymentRepo.save(payment);
    }
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
    if (payment.escrowStatus !== EscrowStatus.HELD) {
      throw new BadRequestException('Payment is not in escrow');
    }

    // if (payment.escrowStatus === EscrowStatus.RELEASED) {
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
    // This could be done via Flutterwave Transfer API or your own logic
    const payout = await this.transferToSeller(payment);

    return {
      message:
        'Delivery has been confirmed and payment to seller is being processed. Funds will be released to the seller within 1-2 business days.',
      payment,
      payout,
    };
  }

  async autoReleaseEscrow(days: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const paymentsToRelease = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('payment.escrowStatus = :status', { status: EscrowStatus.HELD })
      .andWhere('payment.escrowHeldAt <= :cutoffDate', { cutoffDate })
      .getMany();

    let releasedCount = 0;

    for (const payment of paymentsToRelease) {
      const bulkOrderId = payment.flutterwaveResponse?.metadata?.bulkOrderId;
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

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID)
      throw new BadRequestException('Only paid orders can be refunded');
    if (payment.escrowStatus === 'RELEASED')
      throw new BadRequestException(
        'Cannot refund - payment already released to seller',
      );

    try {
      // ✅ FLW refund: find the FLW transaction ID from provider response, then call refund
      const flwTransactionId = payment.flutterwaveResponse?.id; // rename field to providerResponse ideally

      const response = await axios.post(
        `${this.flwBaseUrl}/transactions/${flwTransactionId}/refund`,
        {
          amount: payment.amount, // ✅ naira directly, no * 100
        },
        {
          headers: {
            Authorization: `Bearer ${this.flwSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

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

  async getBankList() {
    const response = await axios.get(`${this.flwBaseUrl}/banks/NG`, {
      headers: { Authorization: `Bearer ${this.flwSecretKey}` },
    });
    return response.data.data; // [{ id, code, name }]
  }

 async verifyBankDetails(accountNumber: string, bankCode: string) {
  try {
    const response = await axios.post(          // ✅ POST not GET
      `${this.flwBaseUrl}/accounts/resolve`,
      {
        account_number: accountNumber,
        account_bank: bankCode,                 // ✅ string e.g. "044"
      },
      {
        headers: {
          Authorization: `Bearer ${this.flwSecretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('Verify bank error:', error.response?.data || error.message);
    throw new BadRequestException(
      error.response?.data?.message || 'Bank verification failed',
    );
  }
}

  /**
   * Transfer funds to seller (via Flutterwave Transfer API)
   */
  // private async transferToSeller(payment: Payment) {
  //   const seller = payment.order.product.seller;
  //   if (!seller.bankCode || !seller.accountNumber) {
  //     console.error(
  //       `Seller ${seller.id} has no bank details — transfer skipped`,
  //     );
  //     // TODO: notify admin to manually process payout
  //     return;
  //   }

  //   try {
  //     const transferRes = await axios.post<any>(
  //       `${this.flwBaseUrl}/transfers`,
  //       {
  //         account_bank: seller.bankCode,
  //         account_number: seller.accountNumber,
  //         amount: payment.amount,
  //         currency: 'NGN',
  //         narration: `Payout for order ${payment.order.id}`,
  //         reference: `PAYOUT-${payment.reference}`,
  //         callback_url: `${this.configService.get('BASE_URL')}/payments/webhook`,
  //       },
  //       {
  //         headers: {
  //           Authorization: `Bearer ${this.flwSecretKey}`,
  //           'Content-Type': 'application/json',
  //         },
  //       },
  //     );

  //     const { status, reference } = transferRes.data.data;

  //     payment.transferReference = reference;
  //     payment.transferredAt = new Date();
  //     await this.paymentRepo.save(payment);

  //     return transferRes.data;
  //   } catch (error) {
  //     console.error('Transfer error:', error.response?.data || error.message);
  //     // Don't throw — escrow released, transfer can be retried manually
  //   }
  // }

//   private async transferToSeller(payment: Payment) {
//   const seller = payment.order.product.seller;

//   if (!seller.bankCode || !seller.accountNumber) {
//     console.error(`Seller ${seller.id} has no bank details — transfer skipped`);
//     return;
//   }

//   try {
//     const transferRes = await axios.post<any>(
//       `${this.flwBaseUrl}/transfers`,
//       {
//         account_bank: seller.bankCode,
//         account_number: seller.accountNumber,
//         amount: payment.amount,
//         currency: 'NGN',
//         narration: `Payout for order ${payment.order.id}`,
//         reference: `PAYOUT-${payment.reference}`,
//         callback_url: `${this.configService.get('BASE_URL')}/payments/webhook`,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${this.flwSecretKey}`,
//           'Content-Type': 'application/json',
//         },
//       },
//     );

//     // ✅ Log the full response so you can see what FLW actually returns
//     console.log('Transfer response:', JSON.stringify(transferRes.data, null, 2));

//     const { status, reference } = transferRes.data.data;

//     // ✅ Check status explicitly — FLW returns "NEW" for queued transfers
//     if (!['NEW', 'PENDING', 'SUCCESSFUL'].includes(status)) {
//       console.error(`Transfer failed with status: ${status}`);
//       return;
//     }

//     payment.transferReference = reference;
//     payment.transferredAt = new Date();
//     await this.paymentRepo.save(payment);

//     return transferRes.data;
//   } catch (error) {
//     // ✅ Log the actual FLW error message clearly
//     console.error(
//       'Transfer error details:',
//       JSON.stringify(error.response?.data, null, 2) || error.message,
//     );
//   }
// }
  async retryPendingTransfers() {
  // Find all payments where escrow is released but transfer hasn't happened yet
  const pendingTransfers = await this.paymentRepo.find({
    where: {
      escrowStatus: EscrowStatus.RELEASED,
      transferReference: IsNull(), // transfer not yet done
    },
    relations: ['order', 'order.product', 'order.product.seller'],
  });

  console.log(`Found ${pendingTransfers.length} pending transfers`);

  for (const payment of pendingTransfers) {
    await this.transferToSeller(payment);
  }
}

async getPayoutBalance(): Promise<number> {
  const response = await axios.get(
    `${this.flwBaseUrl}/balances/NGN`,
    { headers: { Authorization: `Bearer ${this.flwSecretKey}` } },
  );
  return response.data.data.available_balance;
}

private async transferToSeller(payment: Payment): Promise<{
  status: 'QUEUED' | 'SENT' | 'SKIPPED' | 'FAILED';
  message?: string;
  balance?: number;
  reference?: string;
}> {
  const balance = await this.getPayoutBalance();
  const seller = payment.order.product.seller;

  if (!seller.bankCode || !seller.accountNumber) {
    console.error(`Seller ${seller.id} has no bank details � transfer skipped`);
    return { status: 'SKIPPED', message: 'Seller has no bank details' };
  }

  const settledAmount =
    payment.flutterwaveResponse?.amount_settled ?? payment.amount;
  const platformFee = settledAmount * 0.12;
  const sellerAmount = Math.floor(settledAmount - platformFee);

  if (balance < sellerAmount + 10) { // +10 for transfer fee
    const message = `Insufficient payout balance (${balance}) � queuing transfer for later`;
    console.log(message);
    // Don't throw � cron job will retry
    return { status: 'QUEUED', message, balance };
  }
  const proxyAgent = new HttpsProxyAgent(
    this.configService.get<string>('FIXIE_URL') ?? '',
  );

  try {
    const transferRes = await axios.post<any>(
      `${this.flwBaseUrl}/transfers`,
      {
        account_bank: seller.bankCode,
        account_number: seller.accountNumber,
        amount: sellerAmount,
        currency: 'NGN',
        narration: `Payout for order ${payment.order.id}`,
        reference: `PAYOUT-${payment.reference}`,
      },
      {
        headers: {
          Authorization: `Bearer ${this.flwSecretKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: proxyAgent, // routes through Fixie static IP
      },
    );

    console.log('Transfer response:', JSON.stringify(transferRes.data, null, 2));

    payment.platformFee = platformFee;
    payment.sellerAmount = sellerAmount;
    payment.transferReference = transferRes.data.data.reference;
    payment.transferredAt = new Date();
    await this.paymentRepo.save(payment);

    return {
      status: 'SENT',
      reference: transferRes.data.data.reference,
    };
  } catch (error) {
    console.error(
      'Transfer error:',
      JSON.stringify(error.response?.data, null, 2) || error.message,
    );
    return { status: 'FAILED', message: 'Transfer request failed' };
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

      const payment = await this.getPaymentByOrderOrBulk(
        undefined,
        bulkOrderId,
      );
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
