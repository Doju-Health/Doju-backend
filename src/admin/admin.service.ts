import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Product } from 'src/products/entities/product-entity';
import { UserRole } from 'src/users/enums/user.enum';
import { Order } from 'src/orders/entities/order.entity';
import { ProductCategory } from 'src/products/entities/product-category.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { PaymentStatus } from 'src/orders/enums/order.enum';

@Injectable()
export class AdminService {
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
  ) {}

  async getUsers({
    page = 1,
    limit = 10,
    role,
    isActive,
    search,
    sortBy = 'createdAt',
  }: {
    page?: number;
    limit?: number;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    sortBy?: 'createdAt' | 'fullName' | 'email';
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const qb = this.userRepo.createQueryBuilder('user').select([
      'user.id',
      'user.fullName',
      'user.email',
      'user.phoneNumber',
      'user.role',
      'user.companyName',
      'user.address',
      'user.profileImageUrl',
      'user.licenseNumber',
      'user.paystackRecipientCode',
      'user.emailVerified',
      'user.isVerified',
      'user.isActive',
      'user.createdAt',
      'user.updatedAt',
    ]);

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

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'fullName',
        'email',
        'phoneNumber',
        'role',
        'companyName',
        'address',
        'profileImageUrl',
        'licenseNumber',
        'paystackRecipientCode',
        'emailVerified',
        'isVerified',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteUser(id: string, hard: boolean) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
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

  async deactivateUser(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
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

    if (user.isVerified) {
      return { message: 'Seller already verified' };
    }

    user.isVerified = true;
    await this.userRepo.save(user);

    return { message: 'Seller verified successfully' };
  }

  async approveProduct(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.isApproved) {
      return { message: 'Product already approved' };
    }

    product.isApproved = true;
    await this.productRepo.save(product);

    return { message: 'Product approved successfully' };
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
    isVerified?: boolean;
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
      qb.andWhere('seller.isVerified = :isVerified', { isVerified });
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
}
