import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product-entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CloudinaryService } from 'src/common/services/cloudinary.service';
import { EmailModule } from 'src/email/email.module';
import { User } from 'src/users/entities/user.entity';

@Module({
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, CategoriesService, CloudinaryService],
  imports: [TypeOrmModule.forFeature([Product, ProductCategory, User]), EmailModule],
})
export class ProductsModule {}
