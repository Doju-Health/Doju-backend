import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Product } from 'src/products/entities/product-entity';
import { User } from 'src/users/entities/user.entity';
import { CreateOrderDto, CreateBulkOrdersDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, PaymentStatus } from './enums/order.enum';
import { randomUUID } from 'crypto';
import { DeliveryZoneService } from 'src/common/services/delivery-zone.service';
import { DeliveryRateCardService } from 'src/common/services/delivery-rate-card.service';
import { serializeOrderSeller } from 'src/common/services/public-seller.util';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class OrdersService {
  private readonly platformCharges = 200;

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private deliveryZoneService: DeliveryZoneService,
    private deliveryRateCardService: DeliveryRateCardService,
    private emailService: EmailService,
  ) {}

  async create(dto: CreateOrderDto, buyer: User): Promise<Order> {
    // Verify product exists and is active
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, isActive: true },
      relations: ['seller'],
    });

    if (!product) {
      throw new NotFoundException('Product not found or is inactive');
    }

    if (product.isApproved === false) {
      throw new BadRequestException('Product is not approved for ordering');
    }

    // Check stock availability
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}, Requested: ${dto.quantity}`,
      );
    }

    // Calculate base total price
    const totalPrice = Number(product.price) * dto.quantity;

    // Calculate delivery fee
    let deliveryFee = 0;
    let departureZone: number | undefined;
    let arrivalZone: number | undefined;
    let estimatedDeliveryDays: string | undefined;
    let deliveryCity: string | undefined;
    let deliveryState: string | undefined;

    try {
      // Get seller's departure zone from business city
      const sellerCity = product.seller.businessCity;
      if (!sellerCity) {
        throw new BadRequestException(
          'Seller business city not configured for delivery calculation',
        );
      }

      departureZone = this.deliveryZoneService.getZoneByCity(sellerCity);

      // Get buyer's arrival zone (use provided deliveryCity or buyer's city)
      const buyerDeliveryCity = dto.deliveryCity || buyer.city;
      if (!buyerDeliveryCity) {
        throw new BadRequestException(
          'Delivery city required. Provide deliveryCity or update your profile city',
        );
      }

      arrivalZone = this.deliveryZoneService.getZoneByCity(buyerDeliveryCity);

      deliveryCity = buyerDeliveryCity;
      deliveryState = dto.deliveryState || buyer.state;

      // Get delivery fee based on zones and package size
      const deliveryQuote = this.deliveryRateCardService.getDeliveryFee(
        departureZone,
        arrivalZone,
        product.size as 'small' | 'medium' | 'large',
      );

      deliveryFee = deliveryQuote.fee;
      estimatedDeliveryDays = deliveryQuote.estimatedDays;
    } catch (error) {
      // You can choose to fail the order creation or make delivery optional
      // For now, we'll throw an error
      throw new BadRequestException(
        `Delivery calculation failed: ${error.message}`,
      );
    }

    const platformCharges = this.platformCharges;
    const displayDeliveryFee = deliveryFee + platformCharges;
    const estimatedPlatformFee = Math.floor(totalPrice * 0.12);
    const estimatedSellerAmount = Math.floor(totalPrice - estimatedPlatformFee);

    // Create order with delivery information
    const order = this.orderRepo.create({
      buyer,
      product,
      quantity: dto.quantity,
      unitPrice: product.price,
      totalPrice: totalPrice + displayDeliveryFee,
      deliveryAddress: dto.deliveryAddress || buyer.address,
      deliveryCity,
      pickupStore: dto.pickupStore,
      deliveryState,
      departureZone,
      arrivalZone,
      deliveryFee: displayDeliveryFee,
      platformCharges,
      platformFee: null as any,
      sellerAmount: null as any,
      estimatedPlatformFee,
      estimatedSellerAmount,
      estimatedDeliveryDays,
      notes: dto.notes,
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    const savedOrder = await this.orderRepo.save(order);

    await this.notifyBuyerOrderCreated([savedOrder], buyer, savedOrder.id);

    return serializeOrderSeller(savedOrder);
  }

  private async notifyBuyerOrderShipped(orders: Order[]): Promise<void> {
    const buyer = orders[0]?.buyer;
    if (!buyer?.email || orders.length === 0) return;

    const orderId = orders[0].bulkOrderId || orders[0].id;
    const trackingNumber = orders
      .map((order) => order.trackingNumber)
      .filter(
        (tracking, index, trackings) =>
          tracking && trackings.indexOf(tracking) === index,
      )
      .join(', ');

    try {
      await this.emailService.sendBuyerOrderShippedEmail({
        buyerEmail: buyer.email,
        buyerName: buyer.fullName,
        orderId,
        items: orders.map((order) => ({
          productName: order.product?.name || 'Product',
          quantity: order.quantity,
        })),
        trackingNumber: trackingNumber || undefined,
        shippedAt: this.formatDateTime(orders[0].shippedAt || new Date()),
        trackingUrl: this.buildBuyerOrderUrl(orderId, 'track'),
      });
    } catch (error) {
      console.error('Buyer shipped email failed:', String(error));
    }
  }

  private async notifyBuyerOrderDelivered(orders: Order[]): Promise<void> {
    const buyer = orders[0]?.buyer;
    if (!buyer?.email || orders.length === 0) return;

    const orderId = orders[0].bulkOrderId || orders[0].id;
    try {
      await this.emailService.sendBuyerOrderDeliveredEmail({
        buyerEmail: buyer.email,
        buyerName: buyer.fullName,
        orderId,
        items: orders.map((order) => ({
          productName: order.product?.name || 'Product',
          quantity: order.quantity,
          sellerPhoneNumber: order.product?.seller?.phoneNumber || undefined,
        })),
        deliveredAt: this.formatDateTime(orders[0].deliveredAt || new Date()),
        confirmationUrl: this.buildBuyerOrderUrl(orderId, 'confirm'),
      });
    } catch (error) {
      console.error('Buyer delivered email failed:', String(error));
    }
  }

  async createBulk(
    dto: CreateBulkOrdersDto,
    buyer: User,
  ): Promise<{
    orderId: string;
    totalPrice: number;
    bulkDeliveryFee: number;
    bulkEstimatedPlatformFee: number;
    bulkEstimatedSellerAmount: number;
    orders: Order[];
  }> {
    if (dto.productIds.length !== dto.quantities.length) {
      throw new BadRequestException(
        'productIds and quantities must have the same length',
      );
    }

    if (dto.productIds.length === 0) {
      throw new BadRequestException('At least one product is required');
    }

    const result = await this.orderRepo.manager.transaction(async (manager) => {
      const createdOrders: Order[] = [];
      const orderId = `bulk-${randomUUID()}`;
      let totalPrice = 0;
      let bulkDeliveryFee = 0;
      let bulkEstimatedPlatformFee = 0;
      let bulkEstimatedSellerAmount = 0;
      const platformCharges = this.platformCharges;

      for (let i = 0; i < dto.productIds.length; i++) {
        const productId = dto.productIds[i];
        const quantity = dto.quantities[i];

        const product = await manager.findOne(Product, {
          where: { id: productId, isActive: true },
          relations: ['seller'],
        });

        if (!product) {
          throw new NotFoundException(
            `Product not found or is inactive: ${productId}`,
          );
        }

        if (!product.isApproved) {
          throw new BadRequestException(
            `Product is not approved for ordering: ${productId}`,
          );
        }

        if (product.stock < quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${quantity}`,
          );
        }

        const lineTotal = Number(product.price) * quantity;
        const deliveryDetails = this.calculateDeliveryDetails(
          product,
          dto,
          buyer,
        );
        const deliveryFee = deliveryDetails.deliveryFee * quantity;
        const displayDeliveryFee = deliveryFee + platformCharges;
        const orderTotal = lineTotal + displayDeliveryFee;
        totalPrice += orderTotal;
        bulkDeliveryFee += displayDeliveryFee;
        const estimatedPlatformFee = Math.floor(lineTotal * 0.12);
        const estimatedSellerAmount = Math.floor(
          lineTotal - estimatedPlatformFee,
        );
        bulkEstimatedPlatformFee += estimatedPlatformFee;
        bulkEstimatedSellerAmount += estimatedSellerAmount;

        const order = manager.create(Order, {
          buyer,
          product,
          quantity,
          unitPrice: product.price,
          totalPrice: orderTotal,
          bulkOrderId: orderId,
          deliveryAddress: deliveryDetails.deliveryAddress,
          deliveryCity: deliveryDetails.deliveryCity,
          pickupStore: dto.pickupStore,
          deliveryState: deliveryDetails.deliveryState,
          departureZone: deliveryDetails.departureZone,
          arrivalZone: deliveryDetails.arrivalZone,
          deliveryFee: displayDeliveryFee,
          platformCharges,
          estimatedDeliveryDays: deliveryDetails.estimatedDeliveryDays,
          platformFee: null as any,
          sellerAmount: null as any,
          estimatedPlatformFee,
          estimatedSellerAmount,
          notes: dto.notes,
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        });

        const savedOrder = await manager.save(Order, order);
        createdOrders.push(savedOrder);
      }

      for (const order of createdOrders) {
        order.bulkDeliveryFee = bulkDeliveryFee;
        order.bulkEstimatedPlatformFee = bulkEstimatedPlatformFee;
        order.bulkEstimatedSellerAmount = bulkEstimatedSellerAmount;
      }

      await manager.save(Order, createdOrders);

      return {
        orderId,
        totalPrice,
        bulkDeliveryFee,
        bulkEstimatedPlatformFee,
        bulkEstimatedSellerAmount,
        orders: createdOrders.map((order) => serializeOrderSeller(order)),
      };
    });

    await this.notifyBuyerOrderCreated(result.orders, buyer, result.orderId);
    return result;
  }

  private async notifyBuyerOrderCreated(
    orders: Order[],
    buyer: User,
    orderId: string,
  ): Promise<void> {
    if (!buyer.email) return;

    try {
      await this.emailService.sendBuyerOrderCreatedEmail({
        buyerEmail: buyer.email,
        buyerName: buyer.fullName,
        orderId,
        items: orders.map((order) => ({
          productName: order.product?.name || 'Product',
          quantity: order.quantity,
          productPrice: this.formatCurrency(Number(order.unitPrice)),
        })),
        totalAmountPayable: this.formatCurrency(
          orders.reduce((total, order) => total + Number(order.totalPrice), 0),
        ),
        deliveryAddress: orders[0]?.deliveryAddress,
        deliveryCity: orders[0]?.deliveryCity,
        deliveryState: orders[0]?.deliveryState,
        pickupStore: orders[0]?.pickupStore,
        estimatedDeliveryDays: orders[0]?.estimatedDeliveryDays,
        paymentUrl: this.buildBuyerOrderUrl(orderId, 'pay'),
      });
    } catch (error) {
      console.error('Buyer order email failed:', String(error));
    }
  }

  private buildBuyerOrderUrl(
    orderId: string,
    action: 'pay' | 'track' | 'confirm',
  ): string {
    return 'https://dojuhealth.com';
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private calculateDeliveryDetails(
    product: Product,
    dto: {
      deliveryAddress?: string;
      deliveryCity?: string;
      deliveryState?: string;
    },
    buyer: User,
  ): {
    deliveryAddress?: string;
    deliveryCity?: string;
    deliveryState?: string;
    departureZone: number;
    arrivalZone: number;
    deliveryFee: number;
    estimatedDeliveryDays: string;
  } {
    const sellerCity = product.seller.businessCity;
    if (!sellerCity) {
      throw new BadRequestException(
        'Seller business city not configured for delivery calculation',
      );
    }

    const departureZone = this.deliveryZoneService.getZoneByCity(sellerCity);
    const deliveryCity = dto.deliveryCity || buyer.city;
    if (!deliveryCity) {
      throw new BadRequestException(
        'Delivery city required. Provide deliveryCity or update your profile city',
      );
    }

    const arrivalZone = this.deliveryZoneService.getZoneByCity(deliveryCity);
    const deliveryQuote = this.deliveryRateCardService.getDeliveryFee(
      departureZone,
      arrivalZone,
      product.size as 'small' | 'medium' | 'large',
    );

    return {
      deliveryAddress: dto.deliveryAddress || buyer.address,
      deliveryCity,
      deliveryState: dto.deliveryState || buyer.state,
      departureZone,
      arrivalZone,
      deliveryFee: deliveryQuote.fee,
      estimatedDeliveryDays: deliveryQuote.estimatedDays,
    };
  }

  async findAll({
    buyerId,
    page = 1,
    limit = 10,
  }: {
    buyerId?: string;
    page?: number;
    limit?: number;
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller');

    if (buyerId) {
      query.where('order.buyerId = :buyerId', { buyerId });
    }

    const [data, total] = await query
      .orderBy('order.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data: data.map((order) => serializeOrderSeller(order)),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findByBuyer({
    buyerId,
    page = 1,
    limit = 10,
  }: {
    buyerId: string;
    page?: number;
    limit?: number;
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const [data, total] = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('order.buyerId = :buyerId', { buyerId })
      .orderBy('order.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data: data.map((order) => serializeOrderSeller(order)),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findBySeller({
    sellerId,
    page = 1,
    limit = 10,
    orderId,
    productId,
    orderStatus,
    paymentStatus,
    bulkOrderId,
    fromDate,
    toDate,
    search,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  }: {
    sellerId: string;
    page?: number;
    limit?: number;
    orderId?: string;
    productId?: string;
    orderStatus?: string;
    paymentStatus?: string;
    bulkOrderId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const validOrderStatuses = Object.values(OrderStatus) as string[];
    const validPaymentStatuses = Object.values(PaymentStatus) as string[];

    if (orderStatus && !validOrderStatuses.includes(orderStatus)) {
      throw new BadRequestException(`Invalid orderStatus: ${orderStatus}`);
    }
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      throw new BadRequestException(`Invalid paymentStatus: ${paymentStatus}`);
    }

    const parsedFromDate = fromDate ? new Date(fromDate) : undefined;
    const parsedToDate = toDate ? new Date(toDate) : undefined;
    if (parsedFromDate && Number.isNaN(parsedFromDate.getTime())) {
      throw new BadRequestException('fromDate must be a valid date');
    }
    if (parsedToDate && Number.isNaN(parsedToDate.getTime())) {
      throw new BadRequestException('toDate must be a valid date');
    }
    if (parsedToDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate ?? '')) {
      parsedToDate.setHours(23, 59, 59, 999);
    }
    if (parsedFromDate && parsedToDate && parsedFromDate > parsedToDate) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    const sortableColumns: Record<string, string> = {
      createdAt: 'order.createdAt',
      updatedAt: 'order.updatedAt',
      totalPrice: 'order.totalPrice',
      orderStatus: 'order.orderStatus',
      paymentStatus: 'order.paymentStatus',
    };
    if (!sortableColumns[sortBy]) {
      throw new BadRequestException(
        `sortBy must be one of: ${Object.keys(sortableColumns).join(', ')}`,
      );
    }
    const safeSortOrder = sortOrder.toUpperCase();
    if (!['ASC', 'DESC'].includes(safeSortOrder)) {
      throw new BadRequestException('sortOrder must be ASC or DESC');
    }

    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('product.sellerId = :sellerId', { sellerId });

    if (orderId) query.andWhere('order.id = :orderId', { orderId });
    if (productId) query.andWhere('product.id = :productId', { productId });
    if (orderStatus) query.andWhere('order.orderStatus = :orderStatus', { orderStatus });
    if (paymentStatus) query.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    if (bulkOrderId) query.andWhere('order.bulkOrderId = :bulkOrderId', { bulkOrderId });
    if (parsedFromDate) {
      query.andWhere('order.createdAt >= :fromDate', { fromDate: parsedFromDate });
    }
    if (parsedToDate) {
      query.andWhere('order.createdAt <= :toDate', { toDate: parsedToDate });
    }
    if (search?.trim()) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('CAST(order.id AS text) ILIKE :search', { search: `%${search.trim()}%` })
            .orWhere('product.name ILIKE :search', { search: `%${search.trim()}%` })
            .orWhere('order.trackingNumber ILIKE :search', { search: `%${search.trim()}%` })
            .orWhere('buyer.fullName ILIKE :search', { search: `%${search.trim()}%` })
            .orWhere('buyer.email ILIKE :search', { search: `%${search.trim()}%` });
        }),
      );
    }

    const [data, total] = await query
      .orderBy(sortableColumns[sortBy], safeSortOrder as 'ASC' | 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data: data.map((order) => serializeOrderSeller(order)),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['buyer', 'product', 'product.seller'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return serializeOrderSeller(order);
  }

  async findByBulkOrderId(bulkOrderId: string): Promise<{
    orderId: string;
    totalPrice: number;
    bulkDeliveryFee: number;
    bulkEstimatedPlatformFee: number;
    bulkEstimatedSellerAmount: number;
    orders: Order[];
  }> {
    const orders = await this.orderRepo.find({
      where: { bulkOrderId },
      relations: ['buyer', 'product', 'product.seller'],
      order: { createdAt: 'DESC' },
    });

    if (orders.length === 0) {
      throw new NotFoundException('Bulk order not found');
    }

    const totalPrice = orders.reduce(
      (sum, order) => sum + Number(order.totalPrice),
      0,
    );

    const bulkDeliveryFee =
      Number(orders[0]?.bulkDeliveryFee ?? 0) ||
      orders.reduce((sum, order) => sum + Number(order.deliveryFee ?? 0), 0);
    const bulkEstimatedPlatformFee =
      Number(orders[0]?.bulkEstimatedPlatformFee ?? 0) ||
      orders.reduce(
        (sum, order) => sum + Number(order.estimatedPlatformFee ?? 0),
        0,
      );
    const bulkEstimatedSellerAmount =
      Number(orders[0]?.bulkEstimatedSellerAmount ?? 0) ||
      orders.reduce(
        (sum, order) => sum + Number(order.estimatedSellerAmount ?? 0),
        0,
      );

    return {
      orderId: bulkOrderId,
      totalPrice,
      bulkDeliveryFee,
      bulkEstimatedPlatformFee,
      bulkEstimatedSellerAmount,
      orders: orders.map((order) => serializeOrderSeller(order)),
    };
  }

  // async update(id: string, dto: UpdateOrderDto, user: User): Promise<Order> {
  //   const order = await this.findOne(id);

  //   // Only buyer can update their own order or admin/seller can update
  //   if (order.buyer.id !== user.id && order.product.seller.id !== user.id) {
  //     throw new ForbiddenException('You can only update your own orders');
  //   }

  //   Object.assign(order, dto);
  //   return this.orderRepo.save(order);
  // }

  /**
   * Mark order as shipped (seller action)
   */
  async markAsShipped(
    id: string,
    seller: User,
    trackingNumber?: string,
  ): Promise<Order | Order[]> {
    const { orders, isBulk } = await this.getOrdersByIdOrBulk(id);

    for (const order of orders) {
      // Only seller can mark as shipped
      if (order.product.seller.id !== seller.id) {
        throw new ForbiddenException(
          'Only the seller can mark order as shipped',
        );
      }

      // Order must be confirmed and paid
      if (order.orderStatus !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          'Order must be confirmed before shipping',
        );
      }

      if (order.paymentStatus !== PaymentStatus.PAID) {
        throw new BadRequestException('Order must be paid before shipping');
      }

      order.orderStatus = OrderStatus.SHIPPED;
      if (trackingNumber) {
        order.trackingNumber = trackingNumber;
      }
      order.shippedAt = new Date();
    }

    await this.orderRepo.save(orders);
    await this.notifyBuyerOrderShipped(orders);
    return isBulk
      ? orders.map((order) => serializeOrderSeller(order))
      : serializeOrderSeller(orders[0]);
  }

  /**
   * Mark order as delivered (can be automatic via tracking or manual)
   */
  async markAsDelivered(id: string): Promise<Order | Order[]> {
    const { orders, isBulk } = await this.getOrdersByIdOrBulk(id);

    for (const order of orders) {
      if (order.orderStatus !== OrderStatus.SHIPPED) {
        throw new BadRequestException(
          'Order must be shipped before marking as delivered',
        );
      }

      order.orderStatus = OrderStatus.DELIVERED;
      order.deliveredAt = new Date();
    }

    await this.orderRepo.save(orders);
    await this.notifyBuyerOrderDelivered(orders);
    return isBulk
      ? orders.map((order) => serializeOrderSeller(order))
      : serializeOrderSeller(orders[0]);
  }

  /**
   * Complete order (buyer confirms receipt and quality)
   */
  async completeOrder(id: string, buyer: User): Promise<Order | Order[]> {
    const { orders, isBulk } = await this.getOrdersByIdOrBulk(id);

    for (const order of orders) {
      // Only buyer can complete their order
      if (order.buyer.id !== buyer.id) {
        throw new ForbiddenException('Only the buyer can complete the order');
      }

      if (order.orderStatus !== OrderStatus.DELIVERED) {
        throw new BadRequestException(
          'Order must be delivered before completion',
        );
      }

      order.orderStatus = OrderStatus.COMPLETED;
      order.completedAt = new Date();
    }

    await this.orderRepo.save(orders);
    return isBulk
      ? orders.map((order) => serializeOrderSeller(order))
      : serializeOrderSeller(orders[0]);
  }

  async cancel(id: string, user: User): Promise<Order | Order[]> {
    const { orders, isBulk } = await this.getOrdersByIdOrBulk(id);

    for (const order of orders) {
      // Buyer can cancel their own order, seller can cancel if not paid
      const isBuyer = order.buyer.id === user.id;
      const isSeller = order.product.seller.id === user.id;

      if (!isBuyer && !isSeller) {
        throw new ForbiddenException(
          'You do not have permission to cancel this order',
        );
      }

      // Can only cancel pending or confirmed orders
      if (
        order.orderStatus !== OrderStatus.PENDING &&
        order.orderStatus !== OrderStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          `Cannot cancel order with status: ${order.orderStatus}`,
        );
      }

      const stockWasDeducted = order.paymentStatus === PaymentStatus.PAID;

      // If payment is already in escrow, refund will be handled by payment service
      if (stockWasDeducted) {
        // Payment service will handle the refund
        order.paymentStatus = PaymentStatus.PENDING_REFUND;
      }

      // Restore stock only when payment already deducted it.
      if (stockWasDeducted) {
        const product = await this.productRepo.findOne({
          where: { id: order.product.id },
        });

        if (product) {
          product.stock += order.quantity;
          await this.productRepo.save(product);
        }
      }

      // Update order status
      order.orderStatus = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
    }

    await this.orderRepo.save(orders);
    return isBulk
      ? orders.map((order) => serializeOrderSeller(order))
      : serializeOrderSeller(orders[0]);
  }

  private async getOrdersByIdOrBulk(id: string) {
    const isBulk = id.startsWith('bulk-');

    if (isBulk) {
      const orders = await this.orderRepo.find({
        where: { bulkOrderId: id },
        relations: ['buyer', 'product', 'product.seller'],
        order: { createdAt: 'DESC' },
      });

      if (orders.length === 0) {
        throw new NotFoundException('Bulk order not found');
      }

      return { orders, isBulk };
    }

    const order = await this.findOne(id);
    return { orders: [order], isBulk };
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    transactionId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id);

    order.paymentStatus = paymentStatus;
    if (transactionId) {
      order.transactionId = transactionId;
    }

    // Auto-confirm order and reduce stock when payment is successful
    const shouldDeductStock =
      paymentStatus === PaymentStatus.PAID &&
      order.orderStatus === OrderStatus.PENDING;

    if (shouldDeductStock) {
      order.orderStatus = OrderStatus.CONFIRMED;
    }

    const savedOrder = await this.orderRepo.manager.transaction(
      async (manager) => {
        if (shouldDeductStock) {
          await this.reserveStock(
            manager,
            order.product.id,
            order.quantity,
            order.product.name,
          );
        }

        return manager.save(Order, order);
      },
    );
    return serializeOrderSeller(savedOrder);
  }

  async getOrdersByProduct(productId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { product: { id: productId } },
      relations: ['buyer'],
      order: { createdAt: 'DESC' },
    });
  }

  private async reserveStock(
    manager: EntityManager,
    productId: string,
    quantity: number,
    productName: string,
  ): Promise<void> {
    const result = await manager
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :productId', { productId })
      .andWhere('stock >= :quantity', { quantity })
      .execute();

    if (result.affected !== 1) {
      throw new BadRequestException(
        `Insufficient stock for "${productName}". Requested: ${quantity}`,
      );
    }
  }

  async getTotalRevenue(sellerId?: string): Promise<number> {
    let query = this.orderRepo
      .createQueryBuilder('order')
      .where('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere('order.orderStatus = :orderStatus', {
        orderStatus: OrderStatus.COMPLETED,
      })
      .select('SUM(order.totalPrice)', 'total');

    if (sellerId) {
      query = query
        .leftJoin('order.product', 'product')
        .andWhere('product.sellerId = :sellerId', { sellerId });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || 0);
  }

  /**
   * Get pending revenue (money in escrow)
   */
  async getPendingRevenue(sellerId?: string): Promise<number> {
    let query = this.orderRepo
      .createQueryBuilder('order')
      .where('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere('order.orderStatus != :orderStatus', {
        orderStatus: OrderStatus.COMPLETED,
      })
      .select('SUM(order.totalPrice)', 'total');

    if (sellerId) {
      query = query
        .leftJoin('order.product', 'product')
        .andWhere('product.sellerId = :sellerId', { sellerId });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || 0);
  }
}
