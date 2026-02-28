import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from 'src/products/entities/product-entity';
import { Order } from 'src/orders/entities/order.entity';
import { User } from 'src/users/entities/user.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { OrderStatus, PaymentStatus } from 'src/orders/enums/order.enum';
import { EscrowStatus } from 'src/payment/entities/payment.entity';


export interface SellerDashboardStats {
  // Revenue stats
  revenue: {
    total: number; // Total completed revenue
    pending: number; // Money in escrow
    thisMonth: number;
    lastMonth: number;
    growth: number; // Percentage growth
  };

  // Order stats
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    completed: number;
    cancelled: number;
    pendingDelivery: number; // Orders not yet delivered
  };

  // Product stats
  products: {
    total: number;
    active: number;
    inactive: number;
    outOfStock: number;
    lowStock: number; // Less than 5 items
  };

  // Recent activity
  recentOrders: Array<{
    id: string;
    productName: string;
    buyerName: string;
    amount: number;
    status: string;
    createdAt: Date;
  }>;

  // Top selling products
  topProducts: Array<{
    id: string;
    name: string;
    totalSold: number;
    revenue: number;
    imageUrl?: string;
  }>;

  // Performance metrics
  performance: {
    averageDeliveryTime: number; // in days
    orderFulfillmentRate: number; // percentage
    customerSatisfaction: number; // if you have ratings
    totalCustomers: number;
  };
}

@Injectable()
export class SellerDashboardService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
  ) {}

  async getSellerDashboard(seller: User): Promise<SellerDashboardStats> {
    const sellerId = seller.id;

    // Run all queries in parallel for better performance
    const [
      revenueStats,
      orderStats,
      productStats,
      recentOrders,
      topProducts,
      performanceStats,
    ] = await Promise.all([
      this.getRevenueStats(sellerId),
      this.getOrderStats(sellerId),
      this.getProductStats(sellerId),
      this.getRecentOrders(sellerId),
      this.getTopProducts(sellerId),
      this.getPerformanceStats(sellerId),
    ]);

    return {
      revenue: revenueStats,
      orders: orderStats,
      products: productStats,
      recentOrders,
      topProducts,
      performance: performanceStats,
    };
  }

  // ============= REVENUE STATS =============

  private async getRevenueStats(sellerId: string) {
    // Total completed revenue (escrow released)
    const totalRevenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.order', 'order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('payment.escrowStatus = :escrowStatus', {
        escrowStatus: EscrowStatus.RELEASED,
      })
      .select('SUM(payment.amount)', 'total')
      .getRawOne();

    // Pending revenue (in escrow)
    const pendingRevenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.order', 'order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('payment.escrowStatus = :escrowStatus', {
        escrowStatus: EscrowStatus.HELD,
      })
      .select('SUM(payment.amount)', 'total')
      .getRawOne();

    // This month revenue
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthRevenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.order', 'order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('payment.escrowStatus = :escrowStatus', {
        escrowStatus: EscrowStatus.RELEASED,
      })
      .andWhere('payment.escrowReleasedAt >= :startDate', {
        startDate: startOfMonth,
      })
      .select('SUM(payment.amount)', 'total')
      .getRawOne();

    // Last month revenue
    const startOfLastMonth = new Date();
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    startOfLastMonth.setDate(1);
    startOfLastMonth.setHours(0, 0, 0, 0);

    const endOfLastMonth = new Date(startOfMonth);
    endOfLastMonth.setMilliseconds(-1);

    const lastMonthRevenue = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.order', 'order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('payment.escrowStatus = :escrowStatus', {
        escrowStatus: EscrowStatus.RELEASED,
      })
      .andWhere('payment.escrowReleasedAt >= :startDate', {
        startDate: startOfLastMonth,
      })
      .andWhere('payment.escrowReleasedAt <= :endDate', {
        endDate: endOfLastMonth,
      })
      .select('SUM(payment.amount)', 'total')
      .getRawOne();

    const total = parseFloat(totalRevenue?.total || 0);
    const pending = parseFloat(pendingRevenue?.total || 0);
    const thisMonth = parseFloat(thisMonthRevenue?.total || 0);
    const lastMonth = parseFloat(lastMonthRevenue?.total || 0);

    // Calculate growth percentage
    let growth = 0;
    if (lastMonth > 0) {
      growth = ((thisMonth - lastMonth) / lastMonth) * 100;
    } else if (thisMonth > 0) {
      growth = 100;
    }

    return {
      total,
      pending,
      thisMonth,
      lastMonth,
      growth: parseFloat(growth.toFixed(2)),
    };
  }

  // ============= ORDER STATS =============

  private async getOrderStats(sellerId: string) {
    // Get all order counts by status
    const orderCounts = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .select('order.orderStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.orderStatus')
      .getRawMany();

    // Map counts to object
    const statusCounts: { [key: string]: number } = {};
    orderCounts.forEach((row) => {
      statusCounts[row.status] = parseInt(row.count);
    });

    // Calculate pending delivery (orders that are shipped but not delivered)
    const pendingDelivery = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('order.orderStatus IN (:...statuses)', {
        statuses: [OrderStatus.CONFIRMED, OrderStatus.SHIPPED],
      })
      .getCount();

    return {
      total: orderCounts.reduce((sum, row) => sum + parseInt(row.count), 0),
      pending: statusCounts[OrderStatus.PENDING] || 0,
      confirmed: statusCounts[OrderStatus.CONFIRMED] || 0,
      shipped: statusCounts[OrderStatus.SHIPPED] || 0,
      delivered: statusCounts[OrderStatus.DELIVERED] || 0,
      completed: statusCounts[OrderStatus.COMPLETED] || 0,
      cancelled: statusCounts[OrderStatus.CANCELLED] || 0,
      pendingDelivery,
    };
  }

  // ============= PRODUCT STATS =============

  private async getProductStats(sellerId: string) {
    const [total, active, inactive, outOfStock, lowStock] = await Promise.all([
      // Total products
      this.productRepo.count({
        where: { seller: { id: sellerId } },
      }),

      // Active products
      this.productRepo.count({
        where: { seller: { id: sellerId }, isActive: true },
      }),

      // Inactive products
      this.productRepo.count({
        where: { seller: { id: sellerId }, isActive: false },
      }),

      // Out of stock
      this.productRepo
        .createQueryBuilder('product')
        .where('product.sellerId = :sellerId', { sellerId })
        .andWhere('product.stock = 0')
        .getCount(),

      // Low stock (less than 5)
      this.productRepo
        .createQueryBuilder('product')
        .where('product.sellerId = :sellerId', { sellerId })
        .andWhere('product.stock > 0')
        .andWhere('product.stock < 5')
        .getCount(),
    ]);

    return {
      total,
      active,
      inactive,
      outOfStock,
      lowStock,
    };
  }

  // ============= RECENT ORDERS =============

  private async getRecentOrders(sellerId: string, limit: number = 10) {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .where('product.sellerId = :sellerId', { sellerId })
      .orderBy('order.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return orders.map((order) => ({
      id: order.id,
      productName: order.product.name,
      buyerName: order.buyer.fullName || order.buyer.email,
      amount: order.totalPrice,
      status: order.orderStatus,
      createdAt: order.createdAt,
    }));
  }

  // ============= TOP PRODUCTS =============

  private async getTopProducts(sellerId: string, limit: number = 5) {
    const topProducts = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('product.imageUrl', 'imageUrl')
      .addSelect('SUM(order.quantity)', 'totalSold')
      .addSelect('SUM(order.totalPrice)', 'revenue')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.imageUrl')
      .orderBy('SUM(order.totalPrice)', 'DESC')
      .limit(limit)
      .getRawMany();

    return topProducts.map((product) => ({
      id: product.id,
      name: product.name,
      totalSold: parseInt(product.totalSold),
      revenue: parseFloat(product.revenue),
      imageUrl: product.imageUrl,
    }));
  }

  // ============= PERFORMANCE STATS =============

  private async getPerformanceStats(sellerId: string) {
    // Average delivery time
    const deliveryTimes = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('order.orderStatus = :status', {
        status: OrderStatus.COMPLETED,
      })
      .andWhere('order.deliveredAt IS NOT NULL')
      .andWhere('order.createdAt IS NOT NULL')
      .select(
        'EXTRACT(EPOCH FROM (order.deliveredAt - order.createdAt))/86400',
        'days',
      )
      .getRawMany();

    let averageDeliveryTime = 0;
    if (deliveryTimes.length > 0) {
      const totalDays = deliveryTimes.reduce(
        (sum, row) => sum + parseFloat(row.days),
        0,
      );
      averageDeliveryTime = totalDays / deliveryTimes.length;
    }

    // Order fulfillment rate (completed / total orders)
    const totalOrders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .getCount();

    const completedOrders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('order.orderStatus = :status', {
        status: OrderStatus.COMPLETED,
      })
      .getCount();

    const orderFulfillmentRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Total unique customers
    const totalCustomers = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .select('COUNT(DISTINCT order.buyerId)', 'count')
      .getRawOne();

    return {
      averageDeliveryTime: parseFloat(averageDeliveryTime.toFixed(1)),
      orderFulfillmentRate: parseFloat(orderFulfillmentRate.toFixed(2)),
      customerSatisfaction: 0, // TODO: Implement rating system
      totalCustomers: parseInt(totalCustomers?.count || 0),
    };
  }

  // ============= ADDITIONAL ENDPOINTS =============

  /**
   * Get revenue chart data (last 12 months)
   */
  async getRevenueChart(sellerId: string, months: number = 12) {
    const chartData: Array<{ month: string; revenue: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoin('payment.order', 'order')
        .leftJoin('order.product', 'product')
        .where('product.sellerId = :sellerId', { sellerId })
        .andWhere('payment.escrowStatus = :escrowStatus', {
          escrowStatus: EscrowStatus.RELEASED,
        })
        .andWhere('payment.escrowReleasedAt >= :startDate', { startDate })
        .andWhere('payment.escrowReleasedAt <= :endDate', { endDate })
        .select('SUM(payment.amount)', 'total')
        .getRawOne();

      chartData.push({
        month: startDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        revenue: Number(revenue?.total ?? 0),
      });
    }

    return chartData;
  }

  /**
   * Get orders by status for pie chart
   */
  async getOrdersByStatus(sellerId: string) {
    const ordersByStatus = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.product', 'product')
      .where('product.sellerId = :sellerId', { sellerId })
      .select('order.orderStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.orderStatus')
      .getRawMany();

    return ordersByStatus.map((row) => ({
      status: row.status,
      count: parseInt(row.count),
    }));
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(sellerId: string, threshold: number = 5) {
    return this.productRepo
      .createQueryBuilder('product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('product.isActive = true')
      .andWhere('product.stock <= :threshold', { threshold })
      .orderBy('product.stock', 'ASC')
      .getMany();
  }
}
