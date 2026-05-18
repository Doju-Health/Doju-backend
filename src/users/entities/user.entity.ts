import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user.enum';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, select: false })
  password?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.BUYER,
  })
  role: UserRole;

  // 🔹 Google OAuth fields
  @Column({ nullable: true })
  googleId?: string;

  // 🔹 Email verification fields
  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  verificationOtp?: string;

  @Column({ nullable: true })
  verificationOtpExpires?: Date;

  // 🔹 Password reset fields
  @Column({ nullable: true })
  passwordResetOtp?: string;

  @Column({ nullable: true })
  passwordResetOtpExpires?: Date;

  // 🔹 Seller-specific (can be null for buyers)
  @Column({ nullable: true })
  companyName?: string;

  @Column({ nullable: true })
  ninUrl?: string;

  @Column({ nullable: true })
  cacUrl?: string;

  // 🔹 Buyer/Seller personal address
  @Column('text', { nullable: true })
  address?: string; // Full address string

  @Column({ nullable: true })
  city?: string; // City from address

  @Column({ nullable: true })
  state?: string; // State from address

  // 🔹 Seller business address
  @Column('text', { nullable: true })
  businessAddress?: string; // Full business address string

  @Column({ nullable: true })
  businessCity?: string; // City from business address

  @Column({ nullable: true })
  businessState?: string; // State from business address

  @Column({ nullable: true })
  profileImageUrl?: string;

  @Column({ nullable: true })
  bankCode?: string;

  @Column({ nullable: true })
  accountNumber?: string;

  @Column({ nullable: true })
  accountName?: string;

  @Column({ nullable: true })
  licenseNumber?: string;

  @Column({ default: false })
  kycApproved?: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
