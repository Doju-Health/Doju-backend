import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentsService } from './payment.service';
import {
  ConfirmDeliveryDto,
  InitiatePaymentDto,
  VerifyPaymentDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

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
    summary: 'Initialize Paystack payment',
    description:
      'Create a Paystack transaction for an order. Returns authorization URL that redirects user to Paystack payment page.',
  })
  @ApiBearerAuth()
  @ApiBody({
    type: InitiatePaymentDto,
    description: 'Order ID and optional callback URL',
  })
  @ApiResponse({
    status: 201,
    description:
      'Payment initialized successfully. Returns authorization URL, access code, and reference.',
    schema: {
      example: {
        authorizationUrl: 'https://checkout.paystack.com/...',
        accessCode: 'code_..',
        reference: 'ref_...',
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
   * Verify payment after user completes payment on Paystack
   * GET /payments/verify/:reference
   */
  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verify Paystack payment',
    description:
      'Verify the status of a payment transaction on Paystack. Updates order status and escrow status if payment is successful.',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'reference',
    description: 'Paystack payment reference',
    example: 'ref_12345abcde',
  })
  @ApiResponse({
    status: 200,
    description:
      'Payment verified successfully. Returns payment details with status.',
    schema: {
      example: {
        id: 'uuid',
        reference: 'ref_12345abcde',
        status: 'PAID',
        escrowStatus: 'HELD',
        amount: 5000,
        paidAt: '2026-02-10T10:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid payment reference' })
  @ApiResponse({ status: 404, description: 'Payment record not found' })
  @ApiResponse({ status: 500, description: 'Payment verification failed' })
  async verifyPayment(@Param('reference') reference: string) {
    return this.paymentService.verifyPayment(reference);
  }

  /**
   * Paystack webhook endpoint for automatic payment notifications
   * POST /payments/webhook
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paystack webhook handler',
    description:
      'Receives and processes webhook notifications from Paystack for payment events. Verifies signature to ensure authenticity.',
  })
  @ApiBody({ type: Object, description: 'Paystack webhook payload' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: { example: { status: 'success' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
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
    description: 'Order ID with optional feedback and rating',
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
    return this.paymentService.confirmDeliveryAndRelease(dto.orderId, req.user);
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
    description: 'Order UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
    schema: {
      example: {
        id: 'uuid',
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        reference: 'ref_...',
        status: 'PAID',
        amount: 5000,
        escrowStatus: 'HELD',
        provider: 'PAYSTACK',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Payment not found for this order' })
  async getPaymentByOrder(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentByOrder(orderId);
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
    description: 'Order UUID',
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
    return this.paymentService.confirmDeliveryAndRelease(orderId, req.user);
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
    description: 'Order UUID',
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
    return this.paymentService.refundPayment(orderId);
  }
}
