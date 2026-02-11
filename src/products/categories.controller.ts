import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { CategoriesService } from './categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryResponseDto } from './dto/product-category-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';

@ApiTags('Product Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all product categories',
    description: 'Retrieve all active healthcare equipment categories',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all categories',
    type: [ProductCategoryResponseDto],
  })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'Category unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Get category by ID',
    description:
      'Retrieve a specific product category by its unique identifier',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the category',
    type: ProductCategoryResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
  })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FileInterceptor('image'))
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create new product category',
    description:
      'Create a new healthcare equipment category with optional image upload. Requires seller role.',
  })
  @ApiCreatedResponse({
    description: 'Category successfully created',
    type: ProductCategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid category data or category already exists',
    schema: {
      example: {
        message: 'Category "Diagnostics" already exists',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not have seller role',
  })
  async create(
    @Body() dto: CreateProductCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoriesService.create(dto, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FileInterceptor('image'))
  @Patch(':id')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Category unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Update product category',
    description:
      'Update an existing healthcare equipment category with optional image upload.',
  })
  @ApiOkResponse({
    description: 'Category successfully updated',
    type: ProductCategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid category data or category name already exists',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not have seller role',
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.categoriesService.update(id, dto, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Category unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Soft delete product category',
    description:
      'Soft delete a product category (marks as inactive instead of permanent deletion)',
  })
  @ApiOkResponse({
    description: 'Category successfully deleted (marked as inactive)',
    schema: {
      example: {
        message: 'Category successfully deleted',
        id: '123e4567-e89b-12d3-a456-426614174000',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not have seller role',
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
  })
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
    return {
      message: 'Category successfully deleted',
      id,
    };
  }

  @Get(':id/product-count')
  @ApiParam({
    name: 'id',
    description: 'Category unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Get product count for category',
    description: 'Get the number of active products in a specific category',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved product count',
    schema: {
      example: {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        productCount: 15,
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
  })
  async getProductCount(@Param('id') id: string) {
    await this.categoriesService.findOne(id);
    const productCount =
      await this.categoriesService.getProductCountByCategory(id);
    return {
      categoryId: id,
      productCount,
    };
  }
}
