import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Express } from 'express';
import { Product } from './entities/product-entity';
import { ProductCategory } from './entities/product-category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { User } from 'src/users/entities/user.entity';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { VerificationStatus } from 'src/users/enums/user.enum';
import { EmailService } from 'src/email/email.service';
import { UserRole } from 'src/users/enums/user.enum';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private categoryRepo: Repository<ProductCategory>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
  ) {}

  async create(
    dto: CreateProductDto,
    seller: User,
    files?: Express.Multer.File[],
  ) {
    if (seller.isVerified !== VerificationStatus.VERIFIED 
      && seller.isVerified !== VerificationStatus.PENDING) {
      throw new ForbiddenException('Seller account is not verified');
    }

    // Verify category exists
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId, isActive: true },
    });

    if (!category) {
      throw new BadRequestException('Category not found or is inactive');
    }

    let imageUrl = dto.imageUrl;

    if (files && files.length > 0) {
      imageUrl = await Promise.all(
        files.map((file) => this.cloudinaryService.uploadImage(file)),
      );
    }

    const product = this.productRepo.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      size: dto.size,
      imageUrl,
      seller,
      category,
    });

    const savedProduct = await this.productRepo.save(product);

    void this.notifySellerProductPendingReview(savedProduct).catch((error) => {
      this.logger.error(
        'Failed to send seller product pending review notification',
        error instanceof Error ? error.stack : String(error),
      );
    });

    void this.notifyAdminsAboutNewProduct(savedProduct).catch((error) => {
      this.logger.error(
        'Failed to send admin product review notification',
        error instanceof Error ? error.stack : String(error),
      );
    });

    return savedProduct;
  }

  async findAll({
    page = 1,
    limit = 10,
    categoryId,
  }: {
    page?: number;
    limit?: number;
    categoryId?: string;
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('product.isActive = :isActive', { isActive: true });

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    const [data, total] = await queryBuilder
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

  async findApproved({
    page = 1,
    limit = 10,
    categoryId,
  }: {
    page?: number;
    limit?: number;
    categoryId?: string;
  }) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const queryBuilder = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.isApproved = :isApproved', { isApproved: true });

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    const [data, total] = await queryBuilder
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

  async findBySeller(sellerId: string) {
    return this.productRepo.find({
      where: { seller: { id: sellerId }, isActive: true },
    });
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: User,
    files?: Express.Multer.File[],
  ) {
    const product = await this.findOne(id);

    if (product.seller.id !== user.id) {
      throw new ForbiddenException('You are not the seller of this product');
    }

    let imageUrl = dto.imageUrl ?? product.imageUrl;

    if (files && files.length > 0) {
      imageUrl = await Promise.all(
        files.map((file) => this.cloudinaryService.uploadImage(file)),
      );
    }

    Object.assign(product, { ...dto, imageUrl });
    return this.productRepo.save(product);
  }

  async remove(id: string, user: User) {
    const product = await this.findOne(id);

    if (product.seller.id !== user.id) {
      throw new ForbiddenException('You are not the seller of this product');
    }

    product.isActive = false;
    await this.productRepo.save(product);

    return { message: 'Product deleted successfully' };
  }

  private async notifySellerProductPendingReview(
    product: Product,
  ): Promise<void> {
    if (!product.seller?.email) {
      return;
    }

    await this.emailService.sendProductPendingReviewEmail({
      sellerEmail: product.seller.email,
      sellerName: product.seller.fullName,
      productName: product.name,
      productPrice: this.formatMoney(product.price),
      productDescription: product.description,
      productCategory: product.category?.name,
      productStock: product.stock,
      productSize: product.size,
    });
  }

  private async notifyAdminsAboutNewProduct(product: Product): Promise<void> {
    const admins = await this.userRepo.find({
      where: [
        { role: UserRole.ADMIN, isActive: true, emailVerified: true },
        { role: UserRole.SUPER_ADMIN, isActive: true, emailVerified: true },
      ],
      select: ['id', 'fullName', 'email'],
    });

    if (admins.length === 0) {
      return;
    }

    const adminDashboardUrl = this.buildAdminDashboardUrl(product.id);

    await Promise.all(
      admins
        .filter((admin) => !!admin.email)
        .map((admin) =>
          this.emailService.sendProductReviewNotificationEmail({
            adminEmail: admin.email,
            adminName: admin.fullName,
            productName: product.name,
            productPrice: this.formatMoney(product.price),
            productDescription: product.description,
            productCategory: product.category?.name,
            productStock: product.stock,
            productSize: product.size,
            sellerName: product.seller?.fullName || 'Unknown seller',
            sellerEmail: product.seller?.email || 'N/A',
            sellerCompanyName: product.seller?.companyName,
            productCreatedAt: product.createdAt.toISOString(),
            adminDashboardUrl,
          }),
        ),
    );
  }

  async notifySellerProductApproved(productId: string): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.seller?.email) {
      return;
    }

    await this.emailService.sendProductApprovedEmail({
      sellerEmail: product.seller.email,
      sellerName: product.seller.fullName,
      productName: product.name,
      productPrice: this.formatMoney(product.price),
      productDescription: product.description,
      productCategory: product.category?.name,
    });
  }

  async notifySellerProductRejected(
    productId: string,
    rejectionReason: string,
  ): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.seller?.email) {
      return;
    }

    await this.emailService.sendProductRejectedEmail({
      sellerEmail: product.seller.email,
      sellerName: product.seller.fullName,
      productName: product.name,
      productPrice: this.formatMoney(product.price),
      productDescription: product.description,
      productCategory: product.category?.name,
      rejectionReason,
    });
  }

  private buildAdminDashboardUrl(productId: string): string {
    const baseUrl = process.env.ADMIN_DASHBOARD_URL ?? '';
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

    if (normalizedBaseUrl) {
      return `${normalizedBaseUrl}/products/${encodeURIComponent(productId)}`;
    }

    return `/admin/dashboard/products/${encodeURIComponent(productId)}`;
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(Number(value));
  }
}
