import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentStatus } from '../../orders/enums/order.enum';

export enum EscrowStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { eager: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @Column()
  buyerId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ unique: true })
  reference: string;

  @Column({ nullable: true })
  accessCode: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.HELD,
  })
  escrowStatus: EscrowStatus;

  @Column({ default: 'FLUTTERWAVE' })
  provider: string;

  @Column({ nullable: true })
  channel: string; // card, bank, ussd, etc.

  @Column({ type: 'jsonb', nullable: true })
  flutterwaveResponse: any;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  escrowHeldAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  escrowReleasedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  transferReference: string | null; // Reference for payout to seller

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  platformFee: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  deliveryFee: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellerAmount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedPlatformFee: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedSellerAmount: number | null;

  @Column({ type: 'timestamp', nullable: true })
  transferredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
