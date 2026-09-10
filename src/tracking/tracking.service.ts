import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { OrderStatus } from 'src/orders/enums/order.enum';
import { serializeOrderSeller } from 'src/common/services/public-seller.util';
import { OrderTracking } from './entities/tracking.entity';
import { TrackingStatus } from './enums/tracking.enum';
import { User } from 'src/users/entities/user.entity';
import { CreateTrackingUpdateDto } from './dto/tracking.dto';


@Injectable()
export class OrderTrackingService {
  constructor(
    @InjectRepository(OrderTracking)
    private trackingRepo: Repository<OrderTracking>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  /**
   * Create initial tracking record when order is created
   */
  async createTracking(order: Order): Promise<OrderTracking> {
    const tracking = this.trackingRepo.create({
      order,
      currentStatus: TrackingStatus.ORDER_PLACED,
      estimatedDeliveryDate: this.calculateEstimatedDelivery(7), // 7 days default
      publicTrackingToken: this.generatePublicTrackingToken(),
      trackingHistory: [
        {
          status: TrackingStatus.ORDER_PLACED,
          timestamp: new Date(),
          location: 'Order Management System',
          description: 'Order has been placed successfully',
          updatedBy: 'SYSTEM',
        },
      ],
    });

    const savedTracking = await this.trackingRepo.save(tracking);
    return {
      ...savedTracking,
      order: savedTracking.order
        ? serializeOrderSeller(savedTracking.order)
        : savedTracking.order,
    };
  }

  /**
   * Add manual tracking update (by seller)
   */
  async addTrackingUpdate(
    orderId: string,
    dto: CreateTrackingUpdateDto,
    user: User,
  ): Promise<OrderTracking> {
    const tracking = await this.trackingRepo.findOne({
      where: { order: { id: orderId } },
      relations: ['order', 'order.product', 'order.product.seller'],
    });

    if (!tracking) {
      throw new NotFoundException('Tracking information not found');
    }

    // Verify user is the seller
    if (tracking.order.product.seller.id !== user.id) {
      throw new ForbiddenException('Only the seller can update tracking');
    }

    // Validate status progression
    this.validateStatusProgression(tracking.currentStatus, dto.status);

    // Add new update to history
    const newUpdate = {
      status: dto.status,
      timestamp: new Date(),
      location: dto.location,
      description: dto.description,
      updatedBy: user.email || user.id,
      imageUrl: dto.imageUrl,
    };

    tracking.trackingHistory.push(newUpdate);
    tracking.currentStatus = dto.status;
    tracking.lastUpdated = new Date();

    // Update estimated delivery if provided
    if (dto.estimatedDeliveryDate) {
      tracking.estimatedDeliveryDate = new Date(dto.estimatedDeliveryDate);
    }

    // Update order status based on tracking status
    await this.updateOrderStatus(tracking.order, dto.status);

    return this.trackingRepo.save(tracking);
  }

  /**
   * Get tracking information (for buyer or seller)
   */
  async getTracking(orderId: string, user: User): Promise<OrderTracking> {
    const tracking = await this.trackingRepo.findOne({
      where: { order: { id: orderId } },
      relations: ['order', 'order.buyer', 'order.product', 'order.product.seller'],
    });

    if (!tracking) {
      throw new NotFoundException('Tracking information not found');
    }

    // Verify user is buyer or seller
    const isBuyer = tracking.order.buyer.id === user.id;
    const isSeller = tracking.order.product.seller.id === user.id;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('You do not have access to this tracking information');
    }

    return {
      ...tracking,
      order: tracking.order
        ? serializeOrderSeller(tracking.order)
        : tracking.order,
    };
  }

  /**
   * Get public tracking (no auth required - for sharing)
   */
  async getPublicTracking(trackingToken: string): Promise<any> {
    const tracking = await this.trackingRepo.findOne({
      where: { publicTrackingToken: trackingToken },
      relations: ['order', 'order.product'],
    });

    if (!tracking) {
      throw new NotFoundException('Tracking information not found');
    }

    // Return sanitized tracking info (no sensitive data)
    return {
      orderId: tracking.order.id.slice(0, 8),
      productName: tracking.order.product.name,
      quantity: tracking.order.quantity,
      currentStatus: tracking.currentStatus,
      estimatedDeliveryDate: tracking.estimatedDeliveryDate,
      trackingHistory: tracking.trackingHistory.map(h => ({
        status: h.status,
        timestamp: h.timestamp,
        location: h.location,
        description: h.description,
        imageUrl: h.imageUrl,
      })),
    };
  }

  /**
   * Mark order as delivered with proof
   */
  async markAsDelivered(
    orderId: string,
    user: User,
    receiverName: string,
    signatureUrl?: string,
    deliveryNotes?: string,
  ): Promise<OrderTracking> {
    const tracking = await this.trackingRepo.findOne({
      where: { order: { id: orderId } },
      relations: ['order', 'order.product', 'order.product.seller'],
    });

    if (!tracking) {
      throw new NotFoundException('Tracking information not found');
    }

    // Verify user is the seller
    if (tracking.order.product.seller.id !== user.id) {
      throw new ForbiddenException('Only the seller can mark as delivered');
    }

    // Must be in OUT_FOR_DELIVERY or IN_TRANSIT status
    if (
      tracking.currentStatus !== TrackingStatus.OUT_FOR_DELIVERY &&
      tracking.currentStatus !== TrackingStatus.IN_TRANSIT
    ) {
      throw new BadRequestException(
        'Order must be in transit or out for delivery before marking as delivered',
      );
    }

    const now = new Date();
    const deliveryLocation =
      tracking.order.deliveryAddress ?? 'Delivery location not provided';

    if (!Array.isArray(tracking.trackingHistory)) {
      tracking.trackingHistory = [];
    }

    // Add delivery update
    tracking.trackingHistory.push({
      status: TrackingStatus.DELIVERED,
      timestamp: now,
      location: deliveryLocation,
      description: `Package delivered to ${receiverName}`,
      updatedBy: user.email || user.id,
      imageUrl: signatureUrl,
    });

    tracking.currentStatus = TrackingStatus.DELIVERED;
    tracking.actualDeliveryDate = now;
    tracking.receiverName = receiverName;
    tracking.receiverSignatureUrl = signatureUrl;
    tracking.deliveryNotes = deliveryNotes;
    tracking.lastUpdated = now;

    // Update order status to DELIVERED
    tracking.order.orderStatus = OrderStatus.DELIVERED;
    tracking.order.deliveredAt = now;
    await this.orderRepo.save(tracking.order);

    const savedTracking = await this.trackingRepo.save(tracking);
    return {
      ...savedTracking,
      order: savedTracking.order
        ? serializeOrderSeller(savedTracking.order)
        : savedTracking.order,
    };
  }

  /**
   * Get all orders for seller with tracking info
   */
  async getSellerOrders(sellerId: string): Promise<OrderTracking[]> {
    return this.trackingRepo
      .createQueryBuilder('tracking')
      .leftJoinAndSelect('tracking.order', 'order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .where('product.sellerId = :sellerId', { sellerId })
      .orderBy('tracking.lastUpdated', 'DESC')
      .getMany();
  }

  /**
   * Get all orders for buyer with tracking info
   */
  async getBuyerOrders(buyerId: string): Promise<OrderTracking[]> {
    const trackings = await this.trackingRepo
      .createQueryBuilder('tracking')
      .leftJoinAndSelect('tracking.order', 'order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('order.buyerId = :buyerId', { buyerId })
      .orderBy('tracking.lastUpdated', 'DESC')
      .getMany();

    return trackings.map((tracking) => ({
      ...tracking,
      order: tracking.order
        ? serializeOrderSeller(tracking.order)
        : tracking.order,
    })) as OrderTracking[];
  }

  // ============= PRIVATE HELPER METHODS =============

  /**
   * Calculate estimated delivery date
   */
  private calculateEstimatedDelivery(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Generate public tracking token for sharing
   */
  private generatePublicTrackingToken(): string {
    return `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Validate status progression (prevent invalid transitions)
   */
  private validateStatusProgression(currentStatus: TrackingStatus, newStatus: TrackingStatus): void {
    const validTransitions: Record<TrackingStatus, TrackingStatus[]> = {
      [TrackingStatus.ORDER_PLACED]: [
        TrackingStatus.ORDER_CONFIRMED,
        TrackingStatus.CANCELLED,
      ],
      [TrackingStatus.ORDER_CONFIRMED]: [
        TrackingStatus.PROCESSING,
        TrackingStatus.CANCELLED,
      ],
      [TrackingStatus.PROCESSING]: [
        TrackingStatus.PACKED,
        TrackingStatus.CANCELLED,
      ],
      [TrackingStatus.PACKED]: [
        TrackingStatus.PICKED_UP,
        TrackingStatus.IN_TRANSIT,
        TrackingStatus.CANCELLED,
      ],
      [TrackingStatus.PICKED_UP]: [
        TrackingStatus.IN_TRANSIT,
        TrackingStatus.CANCELLED,
      ],
      [TrackingStatus.IN_TRANSIT]: [
        TrackingStatus.AT_SORTING_CENTER,
        TrackingStatus.OUT_FOR_DELIVERY,
        TrackingStatus.DELIVERED,
        TrackingStatus.DELIVERY_ATTEMPTED,
        TrackingStatus.RETURNED,
      ],
      [TrackingStatus.AT_SORTING_CENTER]: [
        TrackingStatus.IN_TRANSIT,
        TrackingStatus.OUT_FOR_DELIVERY,
        TrackingStatus.RETURNED,
      ],
      [TrackingStatus.OUT_FOR_DELIVERY]: [
        TrackingStatus.DELIVERED,
        TrackingStatus.DELIVERY_ATTEMPTED,
        TrackingStatus.RETURNED,
      ],
      [TrackingStatus.DELIVERY_ATTEMPTED]: [
        TrackingStatus.OUT_FOR_DELIVERY,
        TrackingStatus.DELIVERED,
        TrackingStatus.RETURNED,
      ],
      [TrackingStatus.DELIVERED]: [],
      [TrackingStatus.FAILED]: [],
      [TrackingStatus.RETURNED]: [],
      [TrackingStatus.CANCELLED]: [],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Update order status based on tracking status
   */
  private async updateOrderStatus(order: Order, trackingStatus: TrackingStatus): Promise<void> {
    const statusMap: Record<TrackingStatus, string> = {
      [TrackingStatus.ORDER_PLACED]: 'PENDING',
      [TrackingStatus.ORDER_CONFIRMED]: 'CONFIRMED',
      [TrackingStatus.PROCESSING]: 'CONFIRMED',
      [TrackingStatus.PACKED]: 'CONFIRMED',
      [TrackingStatus.PICKED_UP]: 'SHIPPED',
      [TrackingStatus.IN_TRANSIT]: 'SHIPPED',
      [TrackingStatus.AT_SORTING_CENTER]: 'SHIPPED',
      [TrackingStatus.OUT_FOR_DELIVERY]: 'SHIPPED',
      [TrackingStatus.DELIVERY_ATTEMPTED]: 'SHIPPED',
      [TrackingStatus.DELIVERED]: 'DELIVERED',
      [TrackingStatus.FAILED]: 'CANCELLED',
      [TrackingStatus.RETURNED]: 'CANCELLED',
      [TrackingStatus.CANCELLED]: 'CANCELLED',
    };

    const newOrderStatus = statusMap[trackingStatus];
    
    if (newOrderStatus && order.orderStatus !== newOrderStatus) {
      order.orderStatus = newOrderStatus as any;

      if (trackingStatus === TrackingStatus.PICKED_UP || trackingStatus === TrackingStatus.IN_TRANSIT) {
        order.shippedAt = new Date();
      }

      await this.orderRepo.save(order);
    }
  }
}
