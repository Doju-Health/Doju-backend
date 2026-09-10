import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { Product } from 'src/products/entities/product-entity';
import { User } from 'src/users/entities/user.entity';
import { Order } from 'src/orders/entities/order.entity';
import { OrderStatus, PaymentStatus } from 'src/orders/enums/order.enum';
import { AddToCartDto, UpdateCartItemDto, CheckoutDto } from './dto/cart.dto';
import { serializeProductSeller, serializeOrderSeller } from 'src/common/services/public-seller.util';

@Injectable()
export class CartService {
    constructor(
        @InjectRepository(CartItem)
        private cartRepo: Repository<CartItem>,
        @InjectRepository(Product)
        private productRepo: Repository<Product>,
        @InjectRepository(Order)
        private orderRepo: Repository<Order>,
    ) {}
    
    /**
   * Add item to cart
   */
  async addToCart(dto: AddToCartDto, user: User): Promise<CartItem> {
    // Verify product exists and is active
    const product = await this.productRepo.findOne({
      where: { id: dto.productId, isActive: true },
      relations: ['seller'],
    });

    if (!product) {
      throw new NotFoundException('Product not found or is inactive');
    }

    // Check if buyer is trying to buy their own product
    if (product.seller.id === user.id) {
      throw new BadRequestException('You cannot buy your own product');
    }

    // Check stock availability
    if (product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}, Requested: ${dto.quantity}`,
      );
    }

    // Check if item already exists in cart
    let cartItem = await this.cartRepo.findOne({
      where: { user: { id: user.id }, product: { id: dto.productId } },
    });

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + dto.quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Cannot add more. Maximum available: ${product.stock}`,
        );
      }

      cartItem.quantity = newQuantity;
    } else {
      // Create new cart item
      cartItem = this.cartRepo.create({
        user,
        product,
        quantity: dto.quantity,
        selected: true, // Auto-select new items
      });
    }

    const savedCartItem = await this.cartRepo.save(cartItem);
    return {
      ...savedCartItem,
      product: serializeProductSeller(savedCartItem.product),
    };
  }

  /**
   * Get user's cart with all items
   */
  async getCart(user: User): Promise<{
    items: CartItem[];
    summary: {
      totalItems: number;
      selectedItems: number;
      subtotal: number;
      total: number;
    };
  }> {
    const items = await this.cartRepo.find({
      where: { user: { id: user.id } },
      relations: ['product', 'product.seller'],
      order: { createdAt: 'DESC' },
    });

    // Calculate summary
    const selectedItems = items.filter((item) => item.selected);
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return {
      items: items.map((item) => ({
        ...item,
        product: serializeProductSeller(item.product),
      })),
      summary: {
        totalItems: items.length,
        selectedItems: selectedItems.length,
        subtotal,
        total: subtotal, // Add shipping/tax logic here if needed
      },
    };
  }
/**
   * Update cart item quantity or selection
   */
  async updateCartItem(
    itemId: string,
    dto: UpdateCartItemDto,
    user: User,
  ): Promise<CartItem> {
    const cartItem = await this.cartRepo.findOne({
      where: { id: itemId, user: { id: user.id } },
      relations: ['product'],
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Update quantity if provided
    if (dto.quantity !== undefined) {
      if (dto.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      // Check stock
      if (cartItem.product.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${cartItem.product.stock}`,
        );
      }

      cartItem.quantity = dto.quantity;
    }

    // Update selection if provided
    if (dto.selected !== undefined) {
      cartItem.selected = dto.selected;
    }

    return this.cartRepo.save(cartItem);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemId: string, user: User): Promise<void> {
    const cartItem = await this.cartRepo.findOne({
      where: { id: itemId, user: { id: user.id } },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartRepo.remove(cartItem);
  }

  /**
   * Clear entire cart
   */
  async clearCart(user: User): Promise<void> {
    await this.cartRepo.delete({ user: { id: user.id } });
  }

  /**
   * Select/Deselect all items
   */
  async selectAll(user: User, selected: boolean): Promise<void> {
    await this.cartRepo.update(
      { user: { id: user.id } },
      { selected },
    );
  }

  /**
   * Checkout - Convert selected cart items to orders
   * This creates ONE order per seller (groups items by seller)
   */
  async checkout(dto: CheckoutDto, user: User): Promise<{
    orders: Order[];
    totalAmount: number;
    message: string;
  }> {
    // Get selected cart items
    const cartItems = await this.cartRepo.find({
      where: { user: { id: user.id }, selected: true },
      relations: ['product', 'product.seller'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('No items selected for checkout');
    }

    // Verify stock availability for all items
    for (const item of cartItems) {
      const product = await this.productRepo.findOne({
        where: { id: item.product.id },
      });

      if (!product || !product.isActive) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }
    }

    // Group items by seller
    const itemsBySeller = new Map<string, CartItem[]>();
    cartItems.forEach((item) => {
      const sellerId = item.product.seller.id;
      const sellerItems = itemsBySeller.get(sellerId);
      if (sellerItems) {
        sellerItems.push(item);
      } else {
        itemsBySeller.set(sellerId, [item]);
      }
    });

    const orders: Order[] = [];
    let totalAmount = 0;

    // Create one order per seller
    for (const [sellerId, items] of itemsBySeller) {
      // For now, we'll create separate orders for each product
      // You can modify this to create one order with multiple items if you have OrderItems entity

      for (const item of items) {
        const orderTotal = Number(item.product.price) * item.quantity;
        totalAmount += orderTotal;

        const order = this.orderRepo.create({
          buyer: user,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.product.price,
          totalPrice: orderTotal,
          deliveryAddress: dto.deliveryAddress,
          notes: dto.notes,
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        });

        const savedOrder = await this.orderRepo.save(order);

        // Create tracking record
        // await this.trackingService.createTracking(savedOrder);

        orders.push(savedOrder);
      }
    }

    // Remove checked out items from cart
    await this.cartRepo.remove(cartItems);

    return {
      orders: orders.map((order) => serializeOrderSeller(order)),
      totalAmount,
      message: `Successfully created ${orders.length} order(s). Please proceed to payment.`,
    };
  }

  /**
   * Get cart count (badge number)
   */
  async getCartCount(user: User): Promise<number> {
    return this.cartRepo.count({
      where: { user: { id: user.id } },
    });
  }

  /**
   * Validate cart before checkout (check stock, prices, etc.)
   */
  async validateCart(user: User): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const cartItems = await this.cartRepo.find({
      where: { user: { id: user.id }, selected: true },
      relations: ['product'],
    });

    const issues: string[] = [];

    for (const item of cartItems) {
      const product = await this.productRepo.findOne({
        where: { id: item.product.id },
      });

      if (!product) {
        issues.push(`Product "${item.product.name}" no longer exists`);
        continue;
      }

      if (!product.isActive) {
        issues.push(`Product "${product.name}" is no longer available`);
      }

      if (product.stock < item.quantity) {
        issues.push(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, In cart: ${item.quantity}`,
        );
      }

      // Check if price changed (optional - notify user)
      if (Number(product.price) !== Number(item.product.price)) {
        issues.push(
          `Price changed for "${product.name}". Old: ₦${item.product.price}, New: ₦${product.price}`,
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}




