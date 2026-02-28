import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SellerDashboardService } from './seller-dashboard.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

@ApiTags('Seller Dashboard')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('seller/dashboard')
@UseGuards(JwtAuthGuard)
export class SellerDashboardController {
  constructor(
    private readonly dashboardService: SellerDashboardService,
  ) {}

  /**
   * Get comprehensive dashboard stats
   * GET /seller/dashboard
   */
  @Get()
  @ApiOperation({
    summary: 'Get seller dashboard overview',
    description:
      'Returns aggregated seller analytics including revenue, order counts, product inventory stats, recent orders, top products, and performance metrics.',
  })
  @ApiOkResponse({
    description: 'Seller dashboard statistics fetched successfully',
    schema: {
      example: {
        revenue: {
          total: 125000.5,
          pending: 32000,
          thisMonth: 45000,
          lastMonth: 38000,
          growth: 18.42,
        },
        orders: {
          total: 64,
          pending: 8,
          confirmed: 9,
          shipped: 10,
          delivered: 11,
          completed: 22,
          cancelled: 4,
          pendingDelivery: 19,
        },
        products: {
          total: 21,
          active: 18,
          inactive: 3,
          outOfStock: 2,
          lowStock: 4,
        },
        recentOrders: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            productName: 'Wheel Chair',
            buyerName: 'Jane Doe',
            amount: 20000,
            status: 'CONFIRMED',
            createdAt: '2026-02-20T10:30:00.000Z',
          },
        ],
        topProducts: [
          {
            id: 'f2cbad0c-1013-4bf8-a63d-98bdef7f5ca2',
            name: 'Portable Oxygen Concentrator',
            totalSold: 15,
            revenue: 750000,
            imageUrl: 'https://res.cloudinary.com/example/image/upload/sample.jpg',
          },
        ],
        performance: {
          averageDeliveryTime: 3.5,
          orderFulfillmentRate: 92.3,
          customerSatisfaction: 0,
          totalCustomers: 37,
        },
      },
    },
  })
  async getDashboardStats(@Request() req) {
    return this.dashboardService.getSellerDashboard(req.user);
  }

  /**
   * Get revenue chart data (last N months)
   * GET /seller/dashboard/revenue-chart?months=12
   */
  @Get('revenue-chart')
  @ApiOperation({
    summary: 'Get monthly revenue chart data',
    description:
      'Returns released escrow revenue grouped by month for the requested number of months.',
  })
  @ApiQuery({
    name: 'months',
    required: false,
    type: Number,
    example: 12,
    description: 'Number of months to include in chart (default: 12)',
  })
  @ApiOkResponse({
    description: 'Revenue chart data fetched successfully',
    schema: {
      example: [
        { month: 'Mar 2025', revenue: 12000 },
        { month: 'Apr 2025', revenue: 9500.5 },
        { month: 'May 2025', revenue: 14200 },
      ],
    },
  })
  async getRevenueChart(
    @Request() req,
    @Query('months') months: string = '12',
  ) {
    const monthsNum = parseInt(months) || 12;
    return this.dashboardService.getRevenueChart(req.user.id, monthsNum);
  }

  /**
   * Get orders by status (for pie chart)
   * GET /seller/dashboard/orders-by-status
   */
  @Get('orders-by-status')
  @ApiOperation({
    summary: 'Get order distribution by status',
    description:
      'Returns grouped order counts by status for seller dashboard pie chart visualization.',
  })
  @ApiOkResponse({
    description: 'Orders by status fetched successfully',
    schema: {
      example: [
        { status: 'PENDING', count: 8 },
        { status: 'CONFIRMED', count: 9 },
        { status: 'SHIPPED', count: 10 },
        { status: 'DELIVERED', count: 11 },
        { status: 'COMPLETED', count: 22 },
        { status: 'CANCELLED', count: 4 },
      ],
    },
  })
  async getOrdersByStatus(@Request() req) {
    return this.dashboardService.getOrdersByStatus(req.user.id);
  }

  /**
   * Get low stock alerts
   * GET /seller/dashboard/low-stock?threshold=5
   */
  @Get('low-stock')
  @ApiOperation({
    summary: 'Get low stock product alerts',
    description:
      'Returns active seller products with stock less than or equal to the threshold.',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    example: 5,
    description: 'Low stock threshold (default: 5)',
  })
  @ApiOkResponse({
    description: 'Low stock products fetched successfully',
    schema: {
      example: [
        {
          id: 'f2cbad0c-1013-4bf8-a63d-98bdef7f5ca2',
          name: 'Portable Oxygen Concentrator',
          stock: 3,
          isActive: true,
        },
      ],
    },
  })
  async getLowStockAlerts(
    @Request() req,
    @Query('threshold') threshold: string = '5',
  ) {
    const thresholdNum = parseInt(threshold) || 5;
    return this.dashboardService.getLowStockAlerts(req.user.id, thresholdNum);
  }
}
