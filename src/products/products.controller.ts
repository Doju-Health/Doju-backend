import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiQuery,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { ProductsService } from './products.service';
import type {
  ApprovedProductSort,
  SellerProductStatus,
  SellerStockStatus,
} from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { PaginatedProductsResponseDto } from './dto/paginated-products-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { User } from 'src/users/entities/user.entity';

function parseOptionalPrice(value: string | undefined, name: string) {
  if (value === undefined) {
    return undefined;
  }

  if (!value.trim()) {
    throw new BadRequestException(`${name} must be a valid number`);
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    throw new BadRequestException(`${name} must be a valid number`);
  }

  return parsedValue;
}

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all active products',
    description:
      'Retrieve active healthcare equipment products with pagination and optional category filter',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all products',
    type: PaginatedProductsResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (minimum 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page (minimum 1, maximum 100)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter products by category UUID',
  })
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.findAll({ page, limit, categoryId });
  }

  @Get('approved')
  @ApiOperation({
    summary: 'Get all approved products',
    description:
      'Retrieve approved healthcare equipment products with pagination and optional category filter',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved approved products',
    type: PaginatedProductsResponseDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (minimum 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page (minimum 1, maximum 100)',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter products by category UUID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'oxygen',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'name', 'priceAsc', 'priceDesc', 'rating', 'stock'],
    example: 'rating',
    description: 'Sort approved products',
  })
  @ApiQuery({ name: 'minRating', required: false, type: Number, example: 4 })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 1000 })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    example: 100000,
  })
  @ApiQuery({
    name: 'inStock',
    required: false,
    type: Boolean,
    example: true,
    description: 'When true, only products with stock greater than zero',
  })
  getApproved(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: ApprovedProductSort,
    @Query('minRating') minRating?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
  ) {
    return this.productsService.findApproved({
      page,
      limit,
      categoryId,
      search,
      sortBy,
      minRating: minRating === undefined ? undefined : Number(minRating),
      minPrice: minPrice === undefined ? undefined : Number(minPrice),
      maxPrice: maxPrice === undefined ? undefined : Number(maxPrice),
      inStock:
        inStock === undefined ? undefined : inStock.toLowerCase() === 'true',
    });
  }

  @Get('approved/search')
  @ApiOperation({
    summary: 'Search approved products',
    description:
      'Search approved products by name or description with the same filters and sorting as the approved products endpoint',
  })
  @ApiOkResponse({
    description: 'Successfully searched approved products',
    type: PaginatedProductsResponseDto,
  })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'oxygen' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  searchApproved(
    @Query('q') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
    @Query('sortBy') sortBy?: ApprovedProductSort,
    @Query('minRating') minRating?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
  ) {
    return this.productsService.findApproved({
      page,
      limit,
      categoryId,
      search: query,
      sortBy,
      minRating: minRating === undefined ? undefined : Number(minRating),
      minPrice: minPrice === undefined ? undefined : Number(minPrice),
      maxPrice: maxPrice === undefined ? undefined : Number(maxPrice),
      inStock:
        inStock === undefined ? undefined : inStock.toLowerCase() === 'true',
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current seller products',
    description:
      'Retrieve the logged-in seller products with filtering, sorting, and pagination.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved seller products',
    type: PaginatedProductsResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'oxygen',
  })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @ApiQuery({
    name: 'stockStatus',
    required: false,
    enum: ['inStock', 'lowStock', 'outOfStock'],
    description: 'Low stock means fewer than 5 units.',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Defaults to true; set false to include inactive products.',
  })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'name', 'priceAsc', 'priceDesc', 'rating', 'stock'],
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not have seller role',
  })
  getMyProducts(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('status') status?: SellerProductStatus,
    @Query('stockStatus') stockStatus?: SellerStockStatus,
    @Query('isActive') isActive?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: ApprovedProductSort,
  ) {
    if (isActive !== undefined && !['true', 'false'].includes(isActive)) {
      throw new BadRequestException('isActive must be true or false');
    }

    return this.productsService.findBySeller(user.id, {
      page,
      limit,
      categoryId,
      search,
      status,
      stockStatus,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      minPrice: parseOptionalPrice(minPrice, 'minPrice'),
      maxPrice: parseOptionalPrice(maxPrice, 'maxPrice'),
      sortBy,
    });
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve a specific product by its unique identifier',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved the product',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  getOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FilesInterceptor('images', 10))
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'number' },
        size: { type: 'string', enum: ['small', 'medium', 'large'] },
        categoryId: { type: 'string', format: 'uuid' },
        imageUrl: {
          type: 'array',
          items: { type: 'string' },
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create new product with image upload',
    description:
      'Create a new healthcare equipment product with optional image upload(s) to Cloudinary. Requires seller role.',
  })
  @ApiCreatedResponse({
    description:
      'Product successfully created with image uploaded to Cloudinary',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid product data or image upload failed',
    schema: {
      example: {
        message: 'Image upload failed: Invalid file type',
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
  create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    return this.productsService.create(dto, user, files);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FilesInterceptor('images', 10))
  @Patch(':id')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'number' },
        size: { type: 'string', enum: ['small', 'medium', 'large'] },
        categoryId: { type: 'string', format: 'uuid' },
        imageUrl: {
          type: 'array',
          items: { type: 'string' },
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Update existing product',
    description:
      'Update an existing healthcare equipment product. Only the seller who created the product can update it. Optional image upload replaces the previous image on Cloudinary.',
  })
  @ApiOkResponse({
    description:
      'Product successfully updated with new image uploaded to Cloudinary if provided',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid product data or image upload failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not have seller role or is not the product owner',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    return this.productsService.update(id, dto, user, files);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Product unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Delete product',
    description:
      'Soft delete a product by marking it inactive. Only the seller who created the product can delete it.',
  })
  @ApiOkResponse({
    description: 'Product deleted successfully',
    schema: { example: { message: 'Product deleted successfully' } },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not have seller role or is not the product owner',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.remove(id, user);
  }
}
