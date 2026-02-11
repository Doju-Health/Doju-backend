import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product-entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CloudinaryService } from 'src/common/services/cloudinary.service';

@Module({
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, CategoriesService, CloudinaryService],
  imports: [TypeOrmModule.forFeature([Product, ProductCategory])],
})
export class ProductsModule {}
