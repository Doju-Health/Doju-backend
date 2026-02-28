import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { TrackingStatus } from '../enums/tracking.enum';

export interface TrackingHistoryItem {
  status: TrackingStatus;
  timestamp: Date;
  location: string;
  description: string;
  updatedBy: string;
  imageUrl?: string; // Optional proof image (packing, delivery, etc.)
}

@Entity('order_tracking')
export class OrderTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @Column({
    type: 'enum',
    enum: TrackingStatus,
    default: TrackingStatus.ORDER_PLACED,
  })
  currentStatus: TrackingStatus;

  @Column({ type: 'jsonb', default: [] })
  trackingHistory: TrackingHistoryItem[];

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualDeliveryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date;

  @Column({ unique: true })
  publicTrackingToken: string; // For public tracking page

  @Column({ type: 'text', nullable: true })
  deliveryNotes?: string;

  @Column({ nullable: true })
  receiverName?: string; // Who received the package

  @Column({ nullable: true })
  receiverSignatureUrl?: string; // Proof of delivery signature/photo

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
