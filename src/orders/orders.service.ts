import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Product } from 'src/products/entities/product-entity';
import { User } from 'src/users/entities/user.entity';
import { CreateOrderDto, CreateBulkOrdersDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, PaymentStatus } from './enums/order.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
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

    // Check stock availability
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}, Requested: ${dto.quantity}`,
      );
    }

    // Calculate total price
    const totalPrice = Number(product.price) * dto.quantity;

    // Create order
    const order = this.orderRepo.create({
      buyer,
      product,
      quantity: dto.quantity,
      unitPrice: product.price,
      totalPrice,
      deliveryAddress: dto.deliveryAddress,
      notes: dto.notes,
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    // Save order
    const savedOrder = await this.orderRepo.save(order);

    // Reserve product stock (don't reduce until payment is confirmed)
    // Or you can reduce immediately - your choice
    // product.stock -= dto.quantity;
    // await this.productRepo.save(product);

    return savedOrder;
  }

  async createBulk(dto: CreateBulkOrdersDto, buyer: User): Promise<Order[]> {
    if (dto.productIds.length !== dto.quantities.length) {
      throw new BadRequestException(
        'productIds and quantities must have the same length',
      );
    }

    if (dto.productIds.length === 0) {
      throw new BadRequestException('At least one product is required');
    }

    return this.orderRepo.manager.transaction(async (manager) => {
      const createdOrders: Order[] = [];

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

        if (product.stock < quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${quantity}`,
          );
        }

        const totalPrice = Number(product.price) * quantity;

        const order = manager.create(Order, {
          buyer,
          product,
          quantity,
          unitPrice: product.price,
          totalPrice,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        });

        const savedOrder = await manager.save(Order, order);
        createdOrders.push(savedOrder);
      }

      return createdOrders;
    });
  }

  async findAll(buyerId?: string): Promise<Order[]> {
    const query = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller');

    if (buyerId) {
      query.where('order.buyerId = :buyerId', { buyerId });
    }

    return query.orderBy('order.createdAt', 'DESC').getMany();
  }

  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { buyer: { id: buyerId } },
      relations: ['product', 'product.seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async findBySeller(sellerId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { product: { seller: { id: sellerId } } },
      relations: ['buyer', 'product', 'product.seller'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['buyer', 'product', 'product.seller'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: string, dto: UpdateOrderDto, user: User): Promise<Order> {
    const order = await this.findOne(id);

    // Only buyer can update their own order or admin/seller can update
    if (order.buyer.id !== user.id && order.product.seller.id !== user.id) {
      throw new ForbiddenException('You can only update your own orders');
    }

    Object.assign(order, dto);
    return this.orderRepo.save(order);
  }

  /**
   * Mark order as shipped (seller action)
   */
  async markAsShipped(id: string, seller: User, trackingNumber?: string): Promise<Order> {
    const order = await this.findOne(id);

    // Only seller can mark as shipped
    if (order.product.seller.id !== seller.id) {
      throw new ForbiddenException('Only the seller can mark order as shipped');
    }

    // Order must be confirmed and paid
    if (order.orderStatus !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order must be confirmed before shipping');
    }

    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('Order must be paid before shipping');
    }

    order.orderStatus = OrderStatus.SHIPPED;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    order.shippedAt = new Date();

    return this.orderRepo.save(order);
  }

  /**
   * Mark order as delivered (can be automatic via tracking or manual)
   */
  async markAsDelivered(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.orderStatus !== OrderStatus.SHIPPED) {
      throw new BadRequestException('Order must be shipped before marking as delivered');
    }

    order.orderStatus = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();

    return this.orderRepo.save(order);
  }

  /**
   * Complete order (buyer confirms receipt and quality)
   */
  async completeOrder(id: string, buyer: User): Promise<Order> {
    const order = await this.findOne(id);

    // Only buyer can complete their order
    if (order.buyer.id !== buyer.id) {
      throw new ForbiddenException('Only the buyer can complete the order');
    }

    if (order.orderStatus !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order must be delivered before completion');
    }

    order.orderStatus = OrderStatus.COMPLETED;
    order.completedAt = new Date();

    return this.orderRepo.save(order);
  }

  async cancel(id: string, user: User): Promise<Order> {
    const order = await this.findOne(id);

    // Buyer can cancel their own order, seller can cancel if not paid
    const isBuyer = order.buyer.id === user.id;
    const isSeller = order.product.seller.id === user.id;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('You do not have permission to cancel this order');
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

    // If payment is already in escrow, refund will be handled by payment service
    if (order.paymentStatus === PaymentStatus.PAID) {
      // Payment service will handle the refund
      order.paymentStatus = PaymentStatus.PENDING_REFUND;
    }

    // Restore product stock
    const product = await this.productRepo.findOne({
      where: { id: order.product.id },
    });

    if (product) {
      product.stock += order.quantity;
      await this.productRepo.save(product);
    }

    // Update order status
    order.orderStatus = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();

    return this.orderRepo.save(order);
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
    if (paymentStatus === PaymentStatus.PAID && order.orderStatus === OrderStatus.PENDING) {
      order.orderStatus = OrderStatus.CONFIRMED;
      
      // Reduce product stock now that payment is confirmed
      const product = await this.productRepo.findOne({
        where: { id: order.product.id },
      });
      
      if (product) {
        product.stock -= order.quantity;
        await this.productRepo.save(product);
      }
    }

    return this.orderRepo.save(order);
  }

  async getOrdersByProduct(productId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { product: { id: productId } },
      relations: ['buyer'],
      order: { createdAt: 'DESC' },
    });
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
