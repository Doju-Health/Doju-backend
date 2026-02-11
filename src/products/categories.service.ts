import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import type { Express } from 'express';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(ProductCategory)
    private categoryRepo: Repository<ProductCategory>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateProductCategoryDto,
    file?: Express.Multer.File,
  ): Promise<ProductCategory> {
    // Check if category already exists
    const existing = await this.categoryRepo.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new BadRequestException(`Category "${dto.name}" already exists`);
    }

    let imageUrl = dto.imageUrl;

    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(
        file,
        'doju/categories',
      );
    }

    const category = this.categoryRepo.create({
      ...dto,
      imageUrl,
    });

    return this.categoryRepo.save(category);
  }

  async findAll(): Promise<ProductCategory[]> {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProductCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: string,
    dto: UpdateProductCategoryDto,
    file?: Express.Multer.File,
  ): Promise<ProductCategory> {
    const category = await this.findOne(id);

    // Check if new name already exists (if name is being updated)
    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoryRepo.findOne({
        where: { name: dto.name },
      });

      if (existing) {
        throw new BadRequestException(`Category "${dto.name}" already exists`);
      }
    }

    let imageUrl = dto.imageUrl || category.imageUrl;

    if (file) {
      imageUrl = await this.cloudinaryService.uploadImage(
        file,
        'doju/categories',
      );
    }

    Object.assign(category, { ...dto, imageUrl });
    return this.categoryRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    category.isActive = false;
    await this.categoryRepo.save(category);
  }

  async getProductCountByCategory(categoryId: string): Promise<number> {
    const { count } = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin('products', 'product', 'product.categoryId = category.id')
      .where('category.id = :categoryId', { categoryId })
      .select('COUNT(product.id)', 'count')
      .getRawOne();

    return parseInt(count, 10) || 0;
  }
}
