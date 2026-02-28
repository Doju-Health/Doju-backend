import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrderTrackingService } from './tracking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { CreateTrackingUpdateDto, MarkAsDeliveredDto } from './dto/tracking.dto';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: OrderTrackingService) {}

  /**
   * Add manual tracking update (seller only)
   * POST /tracking/:orderId/update
   */
  @Post(':orderId/update')
  @UseGuards(JwtAuthGuard)
  async addTrackingUpdate(
    @Param('orderId') orderId: string,
    @Body() dto: CreateTrackingUpdateDto,
    @Request() req,
  ) {
    return this.trackingService.addTrackingUpdate(orderId, dto, req.user);
  }

  /**
   * Mark order as delivered with proof (seller only)
   * POST /tracking/:orderId/delivered
   */
  @Post(':orderId/delivered')
  @UseGuards(JwtAuthGuard)
  async markAsDelivered(
    @Param('orderId') orderId: string,
    @Body() dto: MarkAsDeliveredDto,
    @Request() req,
  ) {
    return this.trackingService.markAsDelivered(
      orderId,
      req.user,
      dto.receiverName,
      dto.signatureUrl,
      dto.deliveryNotes,
    );
  }

  /**
   * Get tracking information (buyer or seller)
   * GET /tracking/:orderId
   */
  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  async getTracking(@Param('orderId') orderId: string, @Request() req) {
    return this.trackingService.getTracking(orderId, req.user);
  }

  /**
   * Get all orders with tracking for seller
   * GET /tracking/seller/orders
   */
  @Get('seller/orders')
  @UseGuards(JwtAuthGuard)
  async getSellerOrders(@Request() req) {
    return this.trackingService.getSellerOrders(req.user.id);
  }

  /**
   * Get all orders with tracking for buyer
   * GET /tracking/buyer/orders
   */
  @Get('buyer/orders')
  @UseGuards(JwtAuthGuard)
  async getBuyerOrders(@Request() req) {
    return this.trackingService.getBuyerOrders(req.user.id);
  }

  /**
   * Public tracking page (no auth required)
   * GET /tracking/public/:token
   */
  @Get('public/:token')
  async getPublicTracking(@Param('token') token: string) {
    return this.trackingService.getPublicTracking(token);
  }
}
