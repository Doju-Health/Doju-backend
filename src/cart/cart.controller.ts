import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, CheckoutDto, SelectAllDto } from './dto/cart.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { CartItem } from './entities/cart-item.entity';

@ApiTags('Cart')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Add item to cart
   * POST /cart
   */
  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: AddToCartDto })
  @ApiCreatedResponse({
    description: 'Item added to cart or quantity updated',
    type: CartItem,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or insufficient stock' })
  @ApiNotFoundResponse({ description: 'Product not found or inactive' })
  async addToCart(@Body() dto: AddToCartDto, @CurrentUser() user: User) {
    return this.cartService.addToCart(dto, user);
  }

  /**
   * Get user's cart
   * GET /cart
   */
  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiOkResponse({
    description: 'Cart items and summary retrieved successfully',
    schema: {
      example: {
        items: [],
        summary: {
          totalItems: 0,
          selectedItems: 0,
          subtotal: 0,
          total: 0,
        },
      },
    },
  })
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user);
  }

  /**
   * Get cart count (for badge)
   * GET /cart/count
   */
  @Get('count')
  @ApiOperation({ summary: 'Get cart item count' })
  @ApiOkResponse({
    description: 'Cart count retrieved successfully',
    schema: { example: { count: 3 } },
  })
  async getCartCount(@CurrentUser() user: User) {
    const count = await this.cartService.getCartCount(user);
    return { count };
  }

  /**
   * Update cart item
   * PATCH /cart/:itemId
   */
  @Patch(':itemId')
  @ApiOperation({ summary: 'Update cart item quantity or selection' })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiOkResponse({
    description: 'Cart item updated successfully',
    type: CartItem,
  })
  @ApiBadRequestResponse({ description: 'Invalid quantity or stock unavailable' })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  async updateCartItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: User,
  ) {
    return this.cartService.updateCartItem(itemId, dto, user);
  }

  /**
   * Remove item from cart
   * DELETE /cart/:itemId
   */
  @Delete(':itemId')
  @ApiOperation({ summary: 'Remove a single item from cart' })
  @ApiParam({
    name: 'itemId',
    description: 'Cart item unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'Item removed successfully',
    schema: { example: { message: 'Item removed from cart' } },
  })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  async removeFromCart(@Param('itemId') itemId: string, @CurrentUser() user: User) {
    await this.cartService.removeFromCart(itemId, user);
    return { message: 'Item removed from cart' };
  }

  /**
   * Clear entire cart
   * DELETE /cart
   */
  @Delete()
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiOkResponse({
    description: 'Cart cleared successfully',
    schema: { example: { message: 'Cart cleared' } },
  })
  async clearCart(@CurrentUser() user: User) {
    await this.cartService.clearCart(user);
    return { message: 'Cart cleared' };
  }

  /**
   * Select/Deselect all items
   * POST /cart/select-all
   */
  @Post('select-all')
  @ApiOperation({ summary: 'Select or deselect all cart items' })
  @ApiBody({ type: SelectAllDto })
  @ApiOkResponse({
    description: 'All items selection state updated',
    schema: { example: { message: 'All items selected' } },
  })
  async selectAll(@Body() dto: SelectAllDto, @CurrentUser() user: User) {
    await this.cartService.selectAll(user, dto.selected);
    return { message: `All items ${dto.selected ? 'selected' : 'deselected'}` };
  }

  /**
   * Validate cart before checkout
   * GET /cart/validate
   */
  @Get('validate')
  @ApiOperation({ summary: 'Validate selected cart items before checkout' })
  @ApiOkResponse({
    description: 'Validation completed',
    schema: {
      example: {
        valid: true,
        issues: [],
      },
    },
  })
  async validateCart(@CurrentUser() user: User) {
    return this.cartService.validateCart(user);
  }

  /**
   * Checkout - Create orders from cart
   * POST /cart/checkout
   */
  @Post('checkout')
  @ApiOperation({ summary: 'Checkout selected cart items and create orders' })
  @ApiBody({ type: CheckoutDto })
  @ApiCreatedResponse({
    description: 'Orders created successfully',
    schema: {
      example: {
        orders: [],
        totalAmount: 15000,
        message: 'Successfully created 2 order(s). Please proceed to payment.',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'No selected items or stock validation failed' })
  async checkout(@Body() dto: CheckoutDto, @CurrentUser() user: User) {
    return this.cartService.checkout(dto, user);
  }
}
