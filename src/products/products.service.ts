import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
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

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private categoryRepo: Repository<ProductCategory>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateProductDto,
    seller: User,
    files?: Express.Multer.File[],
  ) {
    if (seller.isVerified !== VerificationStatus.VERIFIED) {
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

    return this.productRepo.save(product);
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
}
