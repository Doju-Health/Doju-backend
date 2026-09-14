import 'dotenv/config';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product-entity';
import { UserRole } from 'src/users/enums/user.enum';
import { Order } from 'src/orders/entities/order.entity';
import { ProductCategory } from 'src/products/entities/product-category.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { OrderStatus, PaymentStatus } from 'src/orders/enums/order.enum';
import { CreateAdminAccountDto } from './dto/create-admin-account.dto';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { CompleteAdminRegistrationDto } from './dto/complete-admin-registration.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email/email.service';
import { VerificationStatus } from 'src/users/enums/user.enum';

const ADMIN_USER_SELECT = [
  'user.id',
  'user.fullName',
  'user.email',
  'user.phoneNumber',
  'user.role',
  'user.isSuperAdmin',
  'user.companyName',
  'user.address',
  'user.businessCity',
  'user.businessState',
  'user.businessAddress',
  'user.profileImageUrl',
  'user.licenseNumber',
  'user.kycApproved',
  'user.kycRejectionReason',
  'user.emailVerified',
  'user.isVerified',
  'user.ninUrl',
  'user.cacUrl',
  'user.isActive',
  'user.createdAt',
  'user.updatedAt',
];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(ProductCategory)
    private categoryRepo: Repository<ProductCategory>,
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    private emailService: EmailService,
  ) {}

  async createAdminAccount(dto: CreateAdminAccountDto) {
    const existingSuperAdmin = await this.userRepo.findOne({
      where: { isSuperAdmin: true },
    });

    if (existingSuperAdmin) {
      throw new BadRequestException('A super admin account already exists');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const admin = this.userRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      password: hashedPassword,
      phoneNumber: dto.phoneNumber,
      role: UserRole.SUPER_ADMIN,
      isSuperAdmin: true,
      emailVerified: true,
      isActive: true,
      isVerified: VerificationStatus.VERIFIED,
    });

    const savedAdmin = await this.userRepo.save(admin);
    const { password, ...safeAdmin } = savedAdmin;

    return {
      message: 'Super admin account created successfully',
      user: safeAdmin,
    };
  }

  async inviteAdmin(
    dto: InviteAdminDto,
    requestingUser?: { id: string; isSuperAdmin?: boolean },
  ) {
    if (!requestingUser?.isSuperAdmin) {
      throw new ForbiddenException(
        'Only the super admin can invite admin accounts',
      );
    }

    const existingUser = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (existingUser && existingUser.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        'This email is already registered as a non-admin user',
      );
    }

    if (existingUser?.password && existingUser.emailVerified) {
      throw new BadRequestException('Admin account is already registered');
    }

    const admin =
      existingUser ||
      this.userRepo.create({
        fullName: dto.fullName,
        email: dto.email,
        role: UserRole.ADMIN,
        isSuperAdmin: false,
        emailVerified: false,
        isActive: true,
        isVerified: VerificationStatus.VERIFIED,
      });

    if (existingUser) {
      existingUser.emailVerified = false;
      existingUser.isActive = true;
    }

    await this.userRepo.save(admin);

    const completeUrl = this.buildAdminCompleteRegistrationUrl(dto.email);

    await this.emailService.sendEmail(
      dto.email,
      'You have been invited as a DOJU admin',
      `
        <p>Hello, ${dto.fullName}</p>
        <p>You have been invited to join DOJU as an admin.</p>
        <p>Complete your registration here: <a href="${completeUrl}">${completeUrl}</a></p>
      `,
    );

    return {
      message: 'Admin invitation sent successfully',
      email: dto.email,
      completeUrl,
    };
  }

  async removeAdmin(
    id: string,
    hard: boolean,
    requestingUser: { id: string; isSuperAdmin?: boolean },
  ) {
    if (!requestingUser.isSuperAdmin) {
      throw new ForbiddenException(
        'Only the super admin can remove admin accounts',
      );
    }

    const admin = await this.userRepo.findOne({ where: { id } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not an admin');
    }

    if (admin.isSuperAdmin) {
      throw new BadRequestException(
        'The super admin account cannot be removed',
      );
    }

    if (!hard) {
      admin.isActive = false;
      await this.userRepo.save(admin);
      return { message: 'Admin deactivated successfully' };
    }

    await this.userRepo.delete(admin.id);
    return { message: 'Admin deleted successfully' };
  }

  async completeAdminRegistration(dto: CompleteAdminRegistrationDto) {
    const admin = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new NotFoundException('Invited admin not found');
    }

    if (admin.password && admin.emailVerified) {
      throw new BadRequestException('Admin registration is already complete');
    }

    admin.password = await bcrypt.hash(dto.password, 10);
    admin.emailVerified = true;
    admin.isActive = true;
    admin.isVerified = VerificationStatus.VERIFIED;

    await this.userRepo.save(admin);

    await this.emailService.sendEmail(
      dto.email,
      'Your DOJU admin registration is complete',
      `
        <p>Hello,</p>
        <p>Your DOJU admin registration is complete.</p>
        <p>You can now log in with your email and password.</p>
      `,
    );

    return {
      message: 'Admin registration completed successfully',
      email: admin.email,
    };
  }

  private buildAdminCompleteRegistrationUrl(email: string): string {
    const baseUrl = process.env.ADMIN_COMPLETE_REGISTRATION_URL ?? '';

    return `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(email)}`;
  }

  async getUsers({
    page = 1,
    limit = 10,
    role,
    isActive,
    search,
    companyName,
    createdAt,
    isVerified,
    sortBy = 'createdAt',
  }: {
    page?: number;
    limit?: number;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    companyName?: string;
    createdAt?: string;
    isVerified?: VerificationStatus | boolean | string;
    sortBy?: 'createdAt' | 'fullName' | 'email';
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select(ADMIN_USER_SELECT);

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    this.applyUserFilters(qb, {
      companyName,
      createdAt,
      isVerified,
    });

    switch (sortBy) {
      case 'fullName':
        qb.orderBy('user.fullName', 'ASC');
        break;
      case 'email':
        qb.orderBy('user.email', 'ASC');
        break;
      default:
        qb.orderBy('user.createdAt', 'DESC');
        break;
    }

    const [data, total] = await qb
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getUserById(
    id: string,
    filters?: {
      companyName?: string;
      createdAt?: string;
      isVerified?: VerificationStatus | boolean | string;
    },
  ) {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .select(ADMIN_USER_SELECT)
      .where('user.id = :id', { id });

    this.applyUserFilters(qb, filters);

    const user = await qb.getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private applyUserFilters(
    qb: {
      andWhere: (
        condition: string,
        parameters?: Record<string, unknown>,
      ) => any;
    },
    filters?: {
      companyName?: string;
      createdAt?: string;
      isVerified?: VerificationStatus | boolean | string;
    },
  ) {
    if (!filters) {
      return;
    }

    const { companyName, createdAt, isVerified } = filters;

    if (companyName) {
      qb.andWhere('user.companyName ILIKE :companyName', {
        companyName: `%${companyName}%`,
      });
    }

    if (createdAt) {
      const createdAtDate = new Date(createdAt);

      if (Number.isNaN(createdAtDate.getTime())) {
        throw new BadRequestException('Invalid createdAt value');
      }

      qb.andWhere('DATE(user.createdAt) = DATE(:createdAt)', {
        createdAt: createdAtDate.toISOString(),
      });
    }

    if (isVerified !== undefined) {
      const verificationStatus = this.normalizeVerificationStatus(isVerified);

      if (!verificationStatus) {
        throw new BadRequestException('Invalid isVerified value');
      }

      qb.andWhere('user.isVerified = :isVerified', {
        isVerified: verificationStatus,
      });
    }
  }

  private normalizeVerificationStatus(
    value: VerificationStatus | boolean | string,
  ): VerificationStatus | undefined {
    if (value === true) {
      return VerificationStatus.VERIFIED;
    }

    if (value === false) {
      return VerificationStatus.UNVERIFIED;
    }

    if (
      value === VerificationStatus.VERIFIED ||
      value === VerificationStatus.PENDING ||
      value === VerificationStatus.UNVERIFIED ||
      value === VerificationStatus.REJECTED
    ) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();

      if (normalized === 'true') {
        return VerificationStatus.VERIFIED;
      }

      if (normalized === 'false') {
        return VerificationStatus.UNVERIFIED;
      }

      if (
        normalized === VerificationStatus.VERIFIED ||
        normalized === VerificationStatus.PENDING ||
        normalized === VerificationStatus.UNVERIFIED ||
        normalized === VerificationStatus.REJECTED
      ) {
        return normalized as VerificationStatus;
      }
    }

    return undefined;
  }

  async deleteUser(
    id: string,
    hard: boolean,
    requestingUser?: { id: string; isSuperAdmin?: boolean },
  ) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSuperAdmin) {
      throw new BadRequestException(
        'The super admin account cannot be removed',
      );
    }

    if (user.role === UserRole.ADMIN && !requestingUser?.isSuperAdmin) {
      throw new ForbiddenException(
        'Only the super admin can manage admin accounts',
      );
    }

    if (!hard) {
      user.isActive = false;
      await this.userRepo.save(user);

      if (user.role === UserRole.SELLER) {
        await this.productRepo
          .createQueryBuilder()
          .update(Product)
          .set({ isActive: false })
          .where('"sellerId" = :sellerId', { sellerId: user.id })
          .execute();
      }

      return { message: 'User deactivated successfully' };
    }

    if (user.role === UserRole.SELLER) {
      await this.productRepo
        .createQueryBuilder()
        .delete()
        .from(Product)
        .where('"sellerId" = :sellerId', { sellerId: user.id })
        .execute();
    }

    try {
      await this.userRepo.delete(user.id);
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete user');
    }
  }

  async deactivateUser(
    id: string,
    requestingUser?: { id: string; isSuperAdmin?: boolean },
  ) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSuperAdmin) {
      throw new BadRequestException(
        'The super admin account cannot be deactivated',
      );
    }

    if (user.role === UserRole.ADMIN && !requestingUser?.isSuperAdmin) {
      throw new ForbiddenException(
        'Only the super admin can manage admin accounts',
      );
    }

    if (!user.isActive) {
      return { message: 'User already deactivated' };
    }

    user.isActive = false;
    await this.userRepo.save(user);

    if (user.role === UserRole.SELLER) {
      await this.productRepo
        .createQueryBuilder()
        .update(Product)
        .set({ isActive: false })
        .where('"sellerId" = :sellerId', { sellerId: user.id })
        .execute();
    }

    return { message: 'User deactivated successfully' };
  }

  async removeProduct(id: string, hard: boolean) {
    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!hard) {
      product.isActive = false;
      await this.productRepo.save(product);
      return { message: 'Product deactivated successfully' };
    }

    await this.productRepo.delete(id);
    return { message: 'Product deleted successfully' };
  }

  async verifySeller(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('User is not a seller');
    }

    if (user.isVerified === VerificationStatus.VERIFIED && user.kycApproved) {
      return { message: 'Seller already verified' };
    }

    user.kycApproved = true;
    user.kycRejectionReason = undefined;
    user.isVerified = VerificationStatus.VERIFIED;
    await this.userRepo.save(user);

    await this.emailService.sendSellerKycApprovedEmail(
      user.email,
      user.fullName,
    );

    return { message: 'Seller verified successfully' };
  }

  async rejectSeller(id: string, reason: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('User is not a seller');
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new BadRequestException('Reason is required');
    }

    user.kycApproved = false;
    user.kycRejectionReason = trimmedReason;
    user.isVerified = VerificationStatus.REJECTED;
    await this.userRepo.save(user);

    await this.emailService.sendSellerKycRejectedEmail(
      user.email,
      user.fullName,
      trimmedReason,
    );

    return { message: 'Seller rejected successfully' };
  }

  // async approveSellerKyc(id: string) {
  //   const user = await this.userRepo.findOne({ where: { id } });

  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }

  //   if (user.role !== UserRole.SELLER) {
  //     throw new BadRequestException('User is not a seller');
  //   }

  //   if (user.kycApproved) {
  //     return { message: 'KYC already approved' };
  //   }

  //   user.kycApproved = true;
  //   await this.userRepo.save(user);

  //   return { message: 'KYC approved successfully' };
  // }

  async approveProduct(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.isApproved) {
      return { message: 'Product already approved' };
    }

    product.isApproved = true;
    product.rejectionReason = null;
    await this.productRepo.save(product);

    void this.emailService
      .sendProductApprovedEmail({
        sellerEmail: product.seller.email,
        sellerName: product.seller.fullName,
        productName: product.name,
        productPrice: this.formatMoney(product.price),
        productDescription: product.description,
        productCategory: product.category?.name,
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send approval email for product ${product.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return { message: 'Product approved successfully' };
  }

  async rejectProduct(id: string, reason: string) {
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    product.isApproved = false;
    product.rejectionReason = trimmedReason;
    await this.productRepo.save(product);

    void this.emailService
      .sendProductRejectedEmail({
        sellerEmail: product.seller.email,
        sellerName: product.seller.fullName,
        productName: product.name,
        productPrice: this.formatMoney(product.price),
        productDescription: product.description,
        productCategory: product.category?.name,
        rejectionReason: trimmedReason,
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send rejection email for product ${product.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return { message: 'Product rejected successfully' };
  }

  async getSellerProducts({
    sellerId,
    page = 1,
    limit = 10,
    isVerified,
    categoryId,
    isApproved,
  }: {
    sellerId: string;
    page?: number;
    limit?: number;
    isVerified?: VerificationStatus | boolean | string;
    categoryId?: string;
    isApproved?: boolean;
  }) {
    const seller = await this.userRepo.findOne({ where: { id: sellerId } });

    if (!seller) {
      throw new NotFoundException('User not found');
    }

    if (seller.role !== UserRole.SELLER) {
      throw new BadRequestException('User is not a seller');
    }

    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('seller.id = :sellerId', { sellerId });

    if (categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId });
    }

    if (isApproved !== undefined) {
      qb.andWhere('product.isApproved = :isApproved', { isApproved });
    }

    if (isVerified !== undefined) {
      const verificationStatus =
        isVerified === true
          ? VerificationStatus.VERIFIED
          : isVerified === false
            ? VerificationStatus.UNVERIFIED
            : isVerified === 'verified' ||
                isVerified === 'pending' ||
                isVerified === 'unverified'
              ? isVerified
              : VerificationStatus.UNVERIFIED;

      qb.andWhere('seller.isVerified = :isVerified', {
        isVerified: verificationStatus,
      });
    }

    const [data, total] = await qb
      .orderBy('product.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getBuyerOrders({
    buyerId,
    page = 1,
    limit = 10,
    orderStatus,
    paymentStatus,
  }: {
    buyerId: string;
    page?: number;
    limit?: number;
    orderStatus?: string;
    paymentStatus?: string;
  }) {
    const buyer = await this.userRepo.findOne({ where: { id: buyerId } });

    if (!buyer) {
      throw new NotFoundException('User not found');
    }

    if (buyer.role !== UserRole.BUYER) {
      throw new BadRequestException('User is not a buyer');
    }

    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.buyer', 'buyer')
      .leftJoinAndSelect('order.product', 'product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('buyer.id = :buyerId', { buyerId });

    if (orderStatus) {
      qb.andWhere('order.orderStatus = :orderStatus', { orderStatus });
    }

    if (paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    }

    const [data, total] = await qb
      .orderBy('order.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalBuyers,
      totalSellers,
      totalProducts,
      totalCategories,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: UserRole.BUYER } }),
      this.userRepo.count({ where: { role: UserRole.SELLER } }),
      this.productRepo.count(),
      this.categoryRepo.count(),
      this.paymentRepo.count(),
      this.paymentRepo.count({ where: { status: PaymentStatus.PAID } }),
      this.paymentRepo.count({ where: { status: PaymentStatus.FAILED } }),
    ]);

    return {
      users: {
        total: totalUsers,
        buyers: totalBuyers,
        sellers: totalSellers,
      },
      products: {
        total: totalProducts,
      },
      categories: {
        total: totalCategories,
      },
      transactions: {
        total: totalTransactions,
        successful: successfulTransactions,
        failed: failedTransactions,
      },
    };
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  async getRevenue(sellerId?: string): Promise<number> {
    let query = this.orderRepo
      .createQueryBuilder('order')
      .where('order.paymentStatus = :paymentStatus', {
        paymentStatus: PaymentStatus.PAID,
      })
      .andWhere('order.orderStatus = :orderStatus', {
        orderStatus: OrderStatus.COMPLETED,
      })
      .select('SUM(order.totalPrice)', 'total');

    if (sellerId) {
      query = query
        .leftJoin('order.product', 'product')
        .andWhere('product.sellerId = :sellerId', { sellerId });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || 0);
  }
}
