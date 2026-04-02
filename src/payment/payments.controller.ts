import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payment.service';
import {
  ConfirmDeliveryDto,
  InitiatePaymentDto,
  VerifyBankDetailsDto,
  VerifyPaymentDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { PaymentStatus } from 'src/orders/enums/order.enum';
import { EscrowStatus } from './entities/payment.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentService: PaymentsService) {}

  /**
   * Initialize payment for an order
   * POST /payments/initialize
   */
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Initialize Flutterwave payment',
    description:
      'Create a Flutterwave transaction for an order. Returns authorization URL that redirects user to Flutterwave payment page.',
  })
  @ApiBearerAuth()
  @ApiBody({
    type: InitiatePaymentDto,
    description: 'Order ID or bulkOrderId, plus optional callback URL',
  })
  @ApiResponse({
    status: 201,
    description:
      'Payment initialized successfully. Returns authorization URL and reference.',
    schema: {
      example: {
        authorizationUrl: 'https://checkout.flutterwave.com/v3/hosted/pay/...',
        reference: 'MED-1711980000000-123456',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Order already paid, cancelled, or validation error',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 500, description: 'Payment initialization failed' })
  async initiatePayment(@Body() dto: InitiatePaymentDto, @Request() req) {
    return this.paymentService.initiatePayment(dto, req.user);
  }

  /**
   * Get Flutterwave bank list (NG)
   * GET /payments/banks
   */
  @Get('banks')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Flutterwave bank list (NG)',
    description: 'Retrieve the list of Nigerian banks from Flutterwave.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank list retrieved successfully',
    schema: {
      example: [
        { id: 1, code: '044', name: 'Access Bank' },
        { id: 2, code: '011', name: 'First Bank of Nigeria' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT token' })
  async getBankList() {
    return this.paymentService.getBankList();
  }

  /**
   * Verify bank account details (Flutterwave)
   * POST /payments/banks/verify
   */
  @Post('banks/verify')
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify bank account details',
    description:
      'Verify a bank account number and bank code via Flutterwave.',
  })
  @ApiBody({ type: VerifyBankDetailsDto })
  @ApiResponse({
    status: 200,
    description: 'Bank details verified successfully',
    schema: {
      example: {
        account_number: '0123456789',
        account_name: 'JOHN DOE',
        bank_code: '044',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid bank details' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT token' })
  async verifyBankDetails(@Body() dto: VerifyBankDetailsDto) {
    return this.paymentService.verifyBankDetails(
      dto.accountNumber,
      dto.bankCode,
    );
  }

  /**
   * Admin: Get all transactions with filters
   * GET /payments/transactions
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all transactions (Admin)',
    description:
      'Retrieve all transactions with pagination and optional filters by role, userId, status, escrowStatus, and provider.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (min 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (min 1, max 100)',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by user role (buyer or seller)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID (buyer or seller)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'escrowStatus',
    required: false,
    enum: EscrowStatus,
    description: 'Filter by escrow status',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Filter by provider (e.g., FLUTTERWAVE)',
  })
  getTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('role') role?: UserRole,
    @Query('userId') userId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('escrowStatus') escrowStatus?: EscrowStatus,
    @Query('provider') provider?: string,
  ) {
    if (role && ![UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN].includes(role)) {
      throw new BadRequestException('Invalid role value');
    }

    if (status && !Object.values(PaymentStatus).includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    if (escrowStatus && !Object.values(EscrowStatus).includes(escrowStatus)) {
      throw new BadRequestException('Invalid escrowStatus value');
    }

    return this.paymentService.getTransactions({
      page,
      limit,
      role,
      userId,
      status,
      escrowStatus,
      provider,
    });
  }

  /**
   * User: Get my transactions
   * GET /payments/transactions/me
   */
  @Get('transactions/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my transactions',
    description:
      'Retrieve the current user transactions with pagination and optional filters.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (min 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (min 1, max 100)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filter by payment status',
  })
  @ApiQuery({
    name: 'escrowStatus',
    required: false,
    enum: EscrowStatus,
    description: 'Filter by escrow status',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Filter by provider (e.g., FLUTTERWAVE)',
  })
  getMyTransactions(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: PaymentStatus,
    @Query('escrowStatus') escrowStatus?: EscrowStatus,
    @Query('provider') provider?: string,
  ) {
    if (status && !Object.values(PaymentStatus).includes(status)) {
      throw new BadRequestException('Invalid status value');
    }

    if (escrowStatus && !Object.values(EscrowStatus).includes(escrowStatus)) {
      throw new BadRequestException('Invalid escrowStatus value');
    }

    return this.paymentService.getMyTransactions({
      user: req.user,
      page,
      limit,
      status,
      escrowStatus,
      provider,
    });
  }

  /**
   * Verify payment after user completes payment on Flutterwave
   * GET /payments/verify/:reference
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verify Flutterwave payment',
    description:
      'Verify the status of a payment transaction on Flutterwave. Updates order status and escrow status if payment is successful.',
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'transaction_id',
    description: 'Flutterwave transaction ID',
    example: '1234567',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payment verified successfully. Returns payment details with status.',
    schema: {
      example: {
        id: 'uuid',
        reference: 'MED-1711980000000-123456',
        status: 'PAID',
        escrowStatus: 'HELD',
        amount: 5000,
        provider: 'FLUTTERWAVE',
        paidAt: '2026-02-10T10:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payment reference' })
  @ApiResponse({ status: 404, description: 'Payment record not found' })
  @ApiResponse({ status: 500, description: 'Payment verification failed' })
async verify(@Query('transaction_id') transactionId: string) {
    return this.paymentService.verifyPayment(transactionId);
  }

  /**
   * Flutterwave webhook endpoint for automatic payment notifications
   * POST /payments/webhook
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Flutterwave webhook handler',
    description:
      'Receives and processes webhook notifications from Flutterwave for payment events. Verifies signature to ensure authenticity.',
  })
  @ApiBody({ type: Object, description: 'Flutterwave webhook payload' })
  @ApiHeader({
    name: 'x-flutterwave-signature',
    description: 'Flutterwave webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: { example: { status: 'success' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async webhook(@Body() payload: any, @Headers('verif-hash') signature: string) {
  return this.paymentService.handleWebhook(payload, signature);
}

  /**
   * Buyer confirms delivery and releases payment from escrow to seller
   * POST /payments/confirm-delivery
   */
  @Post('confirm-delivery')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Confirm delivery and release escrow',
    description:
      'Buyer confirms that product has been delivered. Releases escrow payment from buyer to seller and marks order as completed.',
  })
  @ApiBearerAuth()
  @ApiBody({
    type: ConfirmDeliveryDto,
    description: 'Order ID or bulkOrderId with optional feedback and rating',
  })
  @ApiResponse({
    status: 201,
    description: 'Delivery confirmed and escrow released successfully',
    schema: {
      example: {
        id: 'uuid',
        reference: 'ref_...',
        status: 'PAID',
        escrowStatus: 'RELEASED',
        amount: 5000,
        escrowReleasedAt: '2026-02-10T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Payment not in escrow, order not delivered, or permission denied',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 500, description: 'Failed to release escrow' })
  async confirmDelivery(@Body() dto: ConfirmDeliveryDto, @Request() req) {
    return this.paymentService.confirmDeliveryAndRelease(
      dto.orderId,
      req.user,
      dto.bulkOrderId,
    );
  }

  /**
   * Get payment details for an order
   * GET /payments/order/:orderId
   */
  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get payment by order ID',
    description: 'Retrieve payment details and history for a specific order.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID or bulk order identifier (bulk-<uuid>)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'bulkOrderId',
    required: false,
    description: 'Bulk order identifier (bulk-<uuid>)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
    schema: {
      example: {
        id: 'uuid',
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        reference: 'MED-1711980000000-123456',
        status: 'PAID',
        amount: 5000,
        escrowStatus: 'HELD',
        provider: 'FLUTTERWAVE',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found for this order' })
  async getPaymentByOrder(
    @Param('orderId') orderId: string,
    @Query('bulkOrderId') bulkOrderId?: string,
  ) {
    const resolvedBulkOrderId =
      bulkOrderId ?? (orderId.startsWith('bulk-') ? orderId : undefined);
    const resolvedOrderId = resolvedBulkOrderId ? undefined : orderId;
    return this.paymentService.getPaymentByOrder(
      resolvedOrderId,
      resolvedBulkOrderId,
    );
  }

  /**
   * Admin endpoint to manually release escrow (if needed)
   * POST /payments/:orderId/release
   */
  @Post(':orderId/release')
  @UseGuards(JwtAuthGuard) // Add admin guard here
  @ApiOperation({
    summary: 'Manually release escrow (Admin)',
    description:
      'Admin endpoint to manually release escrow payment to seller. Should include admin role guard.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID or bulk order identifier (bulk-<uuid>)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Escrow released successfully',
    schema: {
      example: {
        id: 'uuid',
        status: 'PAID',
        escrowStatus: 'RELEASED',
        escrowReleasedAt: '2026-02-10T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Payment not in escrow or other validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async releaseEscrow(@Param('orderId') orderId: string, @Request() req) {
    // You should add admin role check here
    const bulkOrderId = orderId.startsWith('bulk-') ? orderId : undefined;
    const resolvedOrderId = bulkOrderId ? undefined : orderId;
    return this.paymentService.confirmDeliveryAndRelease(
      resolvedOrderId,
      req.user,
      bulkOrderId,
    );
  }

  /**
   * Refund payment (for cancelled orders)
   * POST /payments/:orderId/refund
   */
  @Post(':orderId/refund')
  @UseGuards(JwtAuthGuard) // Add admin guard here
  @ApiOperation({
    summary: 'Refund payment (Admin)',
    description:
      'Refund a paid order. Only applicable to orders cancelled before delivery. Should include admin role guard.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'orderId',
    description: 'Order UUID or bulk order identifier (bulk-<uuid>)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment refunded successfully',
    schema: {
      example: {
        id: 'uuid',
        status: 'REFUNDED',
        escrowStatus: 'REFUNDED',
        refundedAt: '2026-02-10T11:00:00Z',
        amount: 5000,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Payment not paid, already released, or other validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 500, description: 'Refund processing failed' })
  async refundPayment(@Param('orderId') orderId: string) {
    const bulkOrderId = orderId.startsWith('bulk-') ? orderId : undefined;
    const resolvedOrderId = bulkOrderId ? undefined : orderId;
    return this.paymentService.refundPayment(resolvedOrderId, bulkOrderId);
  }
}
