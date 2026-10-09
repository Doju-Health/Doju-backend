import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
// import { User } from 'src/users/entities/user.entity';
import { Product } from '../../products/entities/product-entity';
import { OrderStatus, PaymentStatus } from '../enums/order.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  buyer: User;

  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ nullable: true })
  bulkOrderId?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  bulkDeliveryFee?: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  bulkEstimatedPlatformFee?: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  bulkEstimatedSellerAmount?: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, default: 0 })
  bulkPlatformCharges?: number | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  orderStatus: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column('text', { nullable: true })
  deliveryAddress?: string; // Full delivery address

  @Column({ nullable: true })
  deliveryCity?: string; // City for delivery

  @Column({ nullable: true })
  deliveryState?: string; // State for delivery

  @Column({ nullable: true })
  pickupStore?: string; // Store for pickup

  @Column('int', { nullable: true })
  departureZone?: number;

  @Column('int', { nullable: true })
  arrivalZone?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, default: 0 })
  deliveryFee?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, default: 0 })
  platformCharges?: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  platformFee?: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  sellerAmount?: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  sellerReceives?: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedPlatformFee?: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedSellerAmount?: number | null;

  @Column({ nullable: true })
  estimatedDeliveryDays?: string;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('text', { nullable: true })
  transactionId?: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ type: 'timestamp', nullable: true })
  shippedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
