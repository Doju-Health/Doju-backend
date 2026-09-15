import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, Brackets, IsNull } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Order } from 'src/orders/entities/order.entity';
import { Product } from 'src/products/entities/product-entity';
import { User } from 'src/users/entities/user.entity';
import { PaymentStatus, OrderStatus } from 'src/orders/enums/order.enum';
import { InitiatePaymentDto } from './dto/payment.dto';
import { EscrowStatus } from './entities/payment.entity';
import { UserRole } from 'src/users/enums/user.enum';
import * as crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { EmailService } from 'src/email/email.service';
import { serializeOrderSeller } from 'src/common/services/public-seller.util';

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
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.flwSecretKey = this.configService.get<string>('FLW_SECRET_KEY') ?? '';
    this.flwWebhookHash =
      this.configService.get<string>('FLW_WEBHOOK_HASH') ?? '';
  }

  // Initialize payment with Flutterwave

  async initiatePayment(dto: InitiatePaymentDto, buyer: User) {
    const requestedBulkOrderId =
      dto.bulkOrderId ??
      (dto.orderId?.startsWith('bulk-') ? dto.orderId : undefined);
    const requestedOrderId = requestedBulkOrderId ? undefined : dto.orderId;

    if (!requestedOrderId && !requestedBulkOrderId) {
      throw new BadRequestException('orderId or bulkOrderId is required');
    }

    let order: Order | null = null;
    let orders: Order[] = [];
    let totalAmount = 0;
    let bulkOrderId: string | undefined;

    if (requestedBulkOrderId) {
      orders = await this.orderRepo.find({
        where: { bulkOrderId: requestedBulkOrderId },
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
      bulkOrderId = requestedBulkOrderId;
      order = orders[0];
    } else if (requestedOrderId) {
      order = await this.orderRepo.findOne({
        where: { id: requestedOrderId },
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

    const deliveryFee = Number(order.deliveryFee ?? 0);
    const productAmount = Number(order.totalPrice) - deliveryFee;
    const estimatedPlatformFee = Math.floor(productAmount * 0.12);
    const estimatedSellerAmount = Math.floor(
      productAmount - estimatedPlatformFee,
    );

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
            orderIds: orders.map((o) => o.id).join(','), // ✅ array → comma-separated string
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
        deliveryFee,
        platformFee: null as any,
        sellerAmount: null as any,
        estimatedPlatformFee,
        estimatedSellerAmount,
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
      data: data.map((payment) => ({
        ...payment,
        order: payment.order
          ? serializeOrderSeller(payment.order)
          : payment.order,
      })),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getTransactionById(id: string, user?: User) {
    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .leftJoinAndSelect('payment.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('payment.id = :id', { id });

    if (
      user &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('buyer.id = :userId', { userId: user.id })
            .orWhere('seller.id = :userId', { userId: user.id });
        }),
      );
    }

    const payment = await qb.getOne();
    if (!payment) {
      throw new NotFoundException('Transaction not found');
    }

    if (user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN) {
      return payment;
    }

    return {
      ...payment,
      order: payment.order
        ? serializeOrderSeller(payment.order)
        : payment.order,
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
        return {
          ...payment,
          order: payment.order
            ? serializeOrderSeller(payment.order)
            : payment.order,
        }; // already handled, skip
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
        let ordersToNotify: Order[];

        if (bulkOrderId) {
          const bulkOrders = await this.orderRepo.find({
            where: { bulkOrderId },
            relations: ['buyer', 'product', 'product.seller'],
          });
          if (bulkOrders.length === 0)
            throw new NotFoundException('Bulk order not found');

          for (const order of bulkOrders) {
            order.paymentStatus = PaymentStatus.PAID;
            order.orderStatus = OrderStatus.CONFIRMED;
            order.transactionId = tx_ref;
          }

          await this.paymentRepo.manager.transaction(async (manager) => {
            for (const order of bulkOrders) {
              await this.decrementProductStock(
                manager,
                order.product.id,
                order.quantity,
                order.product.name,
              );
            }

            await manager.save(Order, bulkOrders);
            await manager.save(Payment, payment);
          });
          ordersToNotify = bulkOrders;
        } else {
          payment.order.paymentStatus = PaymentStatus.PAID;
          payment.order.orderStatus = OrderStatus.CONFIRMED;
          payment.order.transactionId = tx_ref;

          await this.paymentRepo.manager.transaction(async (manager) => {
            await this.decrementProductStock(
              manager,
              payment.order.product.id,
              payment.order.quantity,
              payment.order.product.name,
            );

            await manager.save(Order, payment.order);
            await manager.save(Payment, payment);
          });
          ordersToNotify = [payment.order];
        }

        await this.notifySellerPurchaseEmails(
          ordersToNotify,
          payment.paidAt ?? new Date(),
          tx_ref,
        );
        await this.notifyBuyerPaymentConfirmation(
          ordersToNotify,
          payment.paidAt ?? new Date(),
        );
      }

      if (status !== 'successful') {
        await this.paymentRepo.save(payment);
      }
      return {
        ...payment,
        order: payment.order
          ? serializeOrderSeller(payment.order)
          : payment.order,
      };
    } catch (error) {
      console.error(
        'Payment verification error:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException('Failed to verify payment');
    }
  }

  private async decrementProductStock(
    manager: EntityManager,
    productId: string,
    quantity: number,
    productName: string,
  ): Promise<void> {
    const result = await manager
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => 'stock - :quantity' })
      .where('id = :productId', { productId })
      .andWhere('stock >= :quantity', { quantity })
      .setParameters({ quantity })
      .execute();

    if (result.affected !== 1) {
      throw new BadRequestException(
        `Insufficient stock for "${productName}". Requested: ${quantity}`,
      );
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

  private async notifySellerPurchaseEmails(
    orders: Order[],
    paidAt: Date,
    txRef: string,
  ): Promise<void> {
    const purchaseTime = this.formatDateTime(paidAt);

    const notifications = orders
      .map(async (order) => {
        const seller = order.product?.seller;
        if (!seller?.email) {
          return;
        }

        const buyerName =
          order.buyer?.fullName || order.buyer?.email || 'Buyer';
        const buyerLocation = this.formatBuyerLocation(order);
        const expectedDeliveryDate = this.formatExpectedDeliveryDate(
          order,
          paidAt,
        );

        const orderDetailsUrl = this.buildOrderDetailsUrl(order.id, txRef);

        await this.emailService.sendProductPurchasedEmail({
          sellerEmail: seller.email,
          sellerName: seller.fullName,
          buyerName,
          buyerLocation,
          productName: order.product?.name || 'your product',
          quantity: order.quantity,
          unitPrice: this.formatCurrency(Number(order.unitPrice)),
          totalPaid: this.formatCurrency(Number(order.totalPrice)),
          purchaseTime,
          expectedDeliveryDate,
          deliveryAddress: order.deliveryAddress || undefined,
          deliveryFee:
            order.deliveryFee !== undefined && order.deliveryFee !== null
              ? this.formatCurrency(Number(order.deliveryFee))
              : undefined,
          orderDetailsUrl,
        });
      })
      .map((task) =>
        task.catch((error) => {
          console.error(
            'Seller purchase email failed:',
            error?.message || error,
          );
        }),
      );

    await Promise.all(notifications);
  }

  private async notifyBuyerPaymentConfirmation(
    orders: Order[],
    paidAt: Date,
  ): Promise<void> {
    const buyer = orders[0]?.buyer;
    if (!buyer?.email) return;

    try {
      await this.emailService.sendBuyerPaymentConfirmationEmail({
        buyerEmail: buyer.email,
        buyerName: buyer.fullName,
        orderId: orders[0]?.bulkOrderId || orders[0].id,
        items: orders.map((order) => ({
          productName: order.product?.name || 'Product',
          quantity: order.quantity,
          productPrice: this.formatCurrency(Number(order.unitPrice)),
        })),
        amountPaid: this.formatCurrency(
          orders.reduce((total, order) => total + Number(order.totalPrice), 0),
        ),
        paymentDate: this.formatDateTime(paidAt),
        estimatedDeliveryDate: orders
          .map((order) => this.formatExpectedDeliveryDate(order, paidAt))
          .filter((date, index, dates) => dates.indexOf(date) === index)
          .join('; '),
        pickupStore:
          orders
            .map((order) => order.pickupStore)
            .filter(
              (store, index, stores) =>
                store && stores.indexOf(store) === index,
            )
            .join(', ') || undefined,
        trackingUrl: this.buildBuyerOrderUrl(
          orders[0]?.bulkOrderId || orders[0].id,
          'track',
        ),
      });
    } catch (error) {
      console.error('Buyer payment email failed:', String(error));
    }
  }

  private buildBuyerOrderUrl(orderId: string, action: 'pay' | 'track'): string {
    const baseUrl =
      action === 'pay'
        ? 'https://dojuhealth.com/checkout'
        : 'https://dojuhealth.com/track-order';
    return `${baseUrl}?orderId=${encodeURIComponent(orderId)}`;
  }

  private buildOrderDetailsUrl(orderId: string, txRef: string): string {
    const frontendUrl = process.env.FRONTEND_URL ?? '';
    const baseUrl = frontendUrl.replace(/\/$/, '');
    const route = `/seller/orders/${encodeURIComponent(orderId)}`;

    if (!baseUrl) {
      return `/seller/orders/${encodeURIComponent(orderId)}?reference=${encodeURIComponent(txRef)}`;
    }

    return `${baseUrl}${route}?reference=${encodeURIComponent(txRef)}`;
  }

  private formatBuyerLocation(order: Order): string {
    const city = order.deliveryCity || order.buyer?.city;
    const state = order.deliveryState || order.buyer?.state;

    if (city && state) {
      return `${city}, ${state}`;
    }

    return city || state || order.deliveryAddress || 'N/A';
  }

  private formatExpectedDeliveryDate(order: Order, paidAt: Date): string {
    const daysText = order.estimatedDeliveryDays?.trim();
    if (!daysText) {
      return 'Not available';
    }

    const matches = daysText.match(/\d+/g);
    if (!matches || matches.length === 0) {
      return daysText;
    }

    const minDays = Number(matches[0]);
    const maxDays = Number(matches[matches.length - 1]);
    const start = this.addDays(paidAt, minDays);
    const end = this.addDays(paidAt, maxDays || minDays);

    if (minDays === maxDays || Number.isNaN(maxDays)) {
      return this.formatDate(start);
    }

    return `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
    }).format(date);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Confirm delivery and release escrow to seller
   */
  async confirmDeliveryAndRelease(
    orderId: string | undefined,
    buyer: User,
    bulkOrderId?: string,
    rating?: number,
  ) {
    const requestedBulkOrderId =
      bulkOrderId ??
      (orderId?.startsWith('bulk-') ? orderId : undefined);
    const requestedOrderId = requestedBulkOrderId ? undefined : orderId;

    const { payment, orders } = await this.getPaymentAndOrders({
      orderId: requestedOrderId,
      bulkOrderId: requestedBulkOrderId,
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
    // if (payment.escrowStatus !== EscrowStatus.HELD) {
    //   throw new BadRequestException('Payment is not in escrow');
    // }

    // // Check if all orders are delivered
    // const notDelivered = orders.find(
    //   (o) => o.orderStatus !== OrderStatus.DELIVERED,
    // );
    // if (notDelivered) {
    //   throw new BadRequestException(
    //     'Order must be delivered before releasing payment',
    //   );
    // }

    // Release escrow
    payment.escrowStatus = EscrowStatus.RELEASED;
    payment.escrowReleasedAt = new Date();
    orders.forEach((o) => {
      o.orderStatus = OrderStatus.COMPLETED;
    });

    await this.paymentRepo.save(payment);
    await this.orderRepo.save(orders);

    if (rating !== undefined) {
      await this.updateProductRatings(orders, rating);
    }

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

  private async updateProductRatings(orders: Order[], rating: number) {
    const uniqueProductIds = [
      ...new Set(orders.map((order) => order.product.id)),
    ];

    for (const productId of uniqueProductIds) {
      const product = await this.productRepo.findOne({
        where: { id: productId },
      });

      if (!product) {
        continue;
      }

      const currentCount = Number(product.ratingsCount ?? 0);
      const currentAverage = Number(product.averageRating ?? 0);
      const nextCount = currentCount + 1;
      const nextAverage =
        currentCount === 0
          ? rating
          : (currentAverage * currentCount + rating) / nextCount;

      product.ratingsCount = nextCount;
      product.averageRating = Number(nextAverage.toFixed(2));

      await this.productRepo.save(product);
    }
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
      const response = await axios.post(
        // ✅ POST not GET
        `${this.flwBaseUrl}/accounts/resolve`,
        {
          account_number: accountNumber,
          account_bank: bankCode, // ✅ string e.g. "044"
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
      console.error(
        'Verify bank error:',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.message || 'Bank verification failed',
      );
    }
  }

  async retryPendingTransfers() {
    try {
      // Find all payments where escrow is released but transfer hasn't happened yet
      const pendingTransfers = await this.paymentRepo.find({
        where: {
          escrowStatus: EscrowStatus.RELEASED,
          transferReference: IsNull(), // transfer not yet done
        },
        relations: ['order', 'order.product', 'order.product.seller'],
      });

      console.log(
        `[Retry Transfers] Found ${pendingTransfers.length} pending transfers`,
      );

      for (const payment of pendingTransfers) {
        try {
          await this.transferToSeller(payment);
          console.log(
            `[Retry Transfers] Successfully processed payment ${payment.id}`,
          );
        } catch (error) {
          console.error(
            `[Retry Transfers] Failed for payment ${payment.id}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error('[Retry Transfers] Fatal error:', error);
    }
  }

  async getPayoutBalance(): Promise<number> {
    const response = await axios.get(`${this.flwBaseUrl}/balances/NGN`, {
      headers: { Authorization: `Bearer ${this.flwSecretKey}` },
    });
    return response.data.data.available_balance;
  }

  private async transferToSeller(payment: Payment): Promise<{
    status: 'QUEUED' | 'SENT' | 'SKIPPED' | 'FAILED';
    message?: string;
    balance?: number;
    reference?: string;
    breakdown?: {
      amountPaid: number;
      deliveryFee: number;
      productAmount: number;
      platformFee: number;
      sellerAmount: number;
    };
  }> {
    const balance = await this.getPayoutBalance();
    const seller = payment.order?.product?.seller;
    if (!seller) {
      throw new NotFoundException(
        'Seller information is unavailable for this payment',
      );
    }

    const amountPaid = Number(payment.order.totalPrice);
    const deliveryFee = Number(payment.order.deliveryFee ?? 0);
    const productAmount = amountPaid - deliveryFee;
    const platformFee = Math.floor(productAmount * 0.12);
    const sellerAmount = Math.floor(productAmount - platformFee);
    const breakdown = {
      amountPaid,
      deliveryFee,
      productAmount,
      platformFee,
      sellerAmount,
    };

    payment.platformFee = platformFee;
    payment.deliveryFee = deliveryFee;
    payment.sellerAmount = sellerAmount;
    await this.paymentRepo.save(payment);

    if (!seller.bankCode || !seller.accountNumber) {
      console.error(
        `Seller ${seller.id} has no bank details � transfer skipped`,
      );
      return {
        status: 'SKIPPED',
        message: 'Seller has no bank details',
        breakdown,
      };
    }

    console.log('[Transfer Breakdown]', breakdown);

    if (balance < sellerAmount + 10) {
      // +10 for transfer fee
      const message = `Insufficient payout balance (${balance}) - queuing transfer for later. Required: ${sellerAmount + 10}`;
      console.log(message);
      // Don't throw - cron job will retry
      return { status: 'QUEUED', message, balance, breakdown };
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

      console.log(
        'Transfer response:',
        JSON.stringify(transferRes.data, null, 2),
      );

      payment.platformFee = platformFee;
      payment.sellerAmount = sellerAmount;
      payment.order.platformFee = platformFee;
      payment.order.sellerAmount = sellerAmount;
      payment.transferReference = transferRes.data.data.reference;
      payment.transferredAt = new Date();
      await this.orderRepo.save(payment.order);
      await this.paymentRepo.save(payment);

      return {
        status: 'SENT',
        reference: transferRes.data.data.reference,
        breakdown,
      };
    } catch (error) {
      console.error(
        'Transfer error:',
        JSON.stringify(error.response?.data, null, 2) || error.message,
      );
      return {
        status: 'FAILED',
        message: 'Transfer request failed',
        breakdown,
      };
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
        .leftJoinAndSelect('order.product', 'product')
        .leftJoinAndSelect('product.seller', 'seller')
        .leftJoinAndSelect('payment.buyer', 'buyer')
        .where('order.bulkOrderId = :bulkOrderId', { bulkOrderId })
        .getOne();
    }

    if (orderId) {
      return this.paymentRepo.findOne({
        where: { order: { id: orderId } },
        relations: ['order', 'order.product', 'order.product.seller', 'buyer'],
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
