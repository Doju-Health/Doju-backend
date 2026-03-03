import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, CreateBulkOrdersDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { MarkShippedDto } from './dto/mark-shipped.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { PaymentStatus } from './enums/order.enum';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new order',
    description:
      'Create a new order for a product. Stock will be automatically deducted from the product.',
  })
  @ApiCreatedResponse({
    description: 'Order successfully created',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid order data or insufficient product stock',
    schema: {
      example: {
        message: 'Insufficient stock. Available: 5, Requested: 10',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  async create(@Body() dto: CreateOrderDto, @CurrentUser() buyer: User) {
    return this.ordersService.create(dto, buyer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create multiple orders',
    description:
      'Create multiple orders in one request using paired arrays of productIds and quantities.',
  })
  @ApiBody({ type: CreateBulkOrdersDto })
  @ApiCreatedResponse({
    description: 'Orders successfully created',
    type: [OrderResponseDto],
  })
  @ApiBadRequestResponse({
    description:
      'Invalid input, mismatched array lengths, or insufficient stock',
    schema: {
      example: {
        message: 'productIds and quantities must have the same length',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiNotFoundResponse({
    description: 'One or more products not found',
  })
  async createBulk(
    @Body() dto: CreateBulkOrdersDto,
    @CurrentUser() buyer: User,
  ) {
    return this.ordersService.createBulk(dto, buyer);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my orders',
    description: 'Retrieve all orders placed by the current user',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved user orders',
    type: [OrderResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  async getMyOrders(@CurrentUser() user: User) {
    return this.ordersService.findByBuyer(user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all orders',
    description:
      'Admin endpoint to retrieve all orders (optional buyer filter)',
  })
  @ApiQuery({
    name: 'buyerId',
    required: false,
    description: 'Filter orders by buyer ID',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all orders',
    type: [OrderResponseDto],
  })
  async findAll(@Query('buyerId') buyerId?: string) {
    return this.ordersService.findAll(buyerId);
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'Order unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieve a specific order by its unique identifier',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the order',
    type: OrderResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Order unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Update order',
    description:
      'Update order details (delivery address, notes, status). Only order owner can update.',
  })
  @ApiOkResponse({
    description: 'Order successfully updated',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid order data or cannot update order in current status',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'You can only update your own orders',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.update(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Order unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Cancel order',
    description:
      'Cancel a pending or confirmed order. Product stock will be restored. If paid, refund will be initiated.',
  })
  @ApiOkResponse({
    description: 'Order successfully cancelled',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Cannot cancel order in current status',
    schema: {
      example: {
        message: 'Cannot cancel order with status: delivered',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'You can only cancel your own orders',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.cancel(id, user);
  }

  @Patch(':id/payment-status')
  @ApiParam({
    name: 'id',
    description: 'Order unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Update payment status',
    description:
      'Update payment status for an order (typically called by payment gateway)',
  })
  @ApiOkResponse({
    description: 'Payment status successfully updated',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid payment status',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body()
    body: {
      paymentStatus: PaymentStatus;
      transactionId?: string;
    },
  ) {
    return this.ordersService.updatePaymentStatus(
      id,
      body.paymentStatus,
      body.transactionId,
    );
  }

  @Get('product/:productId')
  @ApiParam({
    name: 'productId',
    description: 'Product unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Get orders for a product',
    description:
      'Retrieve all orders for a specific product (useful for sellers)',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved product orders',
    type: [OrderResponseDto],
  })
  async getProductOrders(@Param('productId') productId: string) {
    return this.ordersService.getOrdersByProduct(productId);
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Get total revenue',
    description:
      'Get total revenue from paid orders (admin endpoint or by seller)',
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Get revenue for specific seller',
  })
  @ApiOkResponse({
    description: 'Successfully calculated revenue',
    schema: {
      example: {
        total: 15499.95,
        currency: 'USD',
      },
    },
  })
  async getTotalRevenue(@Query('sellerId') sellerId?: string) {
    const total = await this.ordersService.getTotalRevenue(sellerId);
    return {
      total,
      currency: 'USD',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller/my-sales')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get seller orders',
    description: 'Retrieve all orders for products sold by the current seller',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved seller orders',
    type: [OrderResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  async getSellerOrders(@CurrentUser() seller: User) {
    return this.ordersService.findBySeller(seller.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('seller/pending-revenue')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending revenue',
    description:
      'Get total pending revenue (money in escrow) for the current seller',
  })
  @ApiOkResponse({
    description: 'Successfully calculated pending revenue',
    schema: {
      example: {
        total: 5000.0,
        currency: 'USD',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  async getPendingRevenue(@CurrentUser() seller: User) {
    const total = await this.ordersService.getPendingRevenue(seller.id);
    return {
      total,
      currency: 'USD',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/ship')
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Order unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Mark order as shipped (Seller)',
    description:
      'Seller marks order as shipped and optionally provides tracking number. Order must be confirmed and paid.',
  })
  @ApiBody({ type: MarkShippedDto, description: 'Optional tracking number' })
  @ApiOkResponse({
    description: 'Order successfully marked as shipped',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Order must be confirmed and paid before shipping',
    schema: {
      example: {
        message: 'Order must be confirmed before shipping',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Only the seller can mark order as shipped',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async markAsShipped(
    @Param('id') id: string,
    @Body() dto: MarkShippedDto,
    @CurrentUser() seller: User,
  ) {
    return this.ordersService.markAsShipped(id, seller, dto.trackingNumber);
  }

  @Patch(':id/deliver')
  @ApiParam({
    name: 'id',
    description: 'Order unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Mark order as delivered',
    description:
      'Mark order as delivered. Can be called automatically via tracking system or manually. Order must be shipped.',
  })
  @ApiOkResponse({
    description: 'Order successfully marked as delivered',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Order must be shipped before marking as delivered',
    schema: {
      example: {
        message: 'Order must be shipped before marking as delivered',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async markAsDelivered(@Param('id') id: string) {
    return this.ordersService.markAsDelivered(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/complete')
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Order unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Complete order (Buyer)',
    description:
      'Buyer confirms receipt and marks order as complete. Once complete, escrow payment is released to seller.',
  })
  @ApiOkResponse({
    description: 'Order successfully completed',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Order must be delivered before completion',
    schema: {
      example: {
        message: 'Order must be delivered before completion',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Only the buyer can complete the order',
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
  })
  async completeOrder(@Param('id') id: string, @CurrentUser() buyer: User) {
    return this.ordersService.completeOrder(id, buyer);
  }
}
