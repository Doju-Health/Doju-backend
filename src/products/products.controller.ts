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
  getApproved(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productsService.findApproved({ page, limit, categoryId });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current seller products',
    description: 'Retrieve all active products created by the logged-in seller.',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved seller products',
    type: [ProductResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  @ApiForbiddenResponse({
    description: 'User does not have seller role',
  })
  getMyProducts(@CurrentUser() user: User) {
    return this.productsService.findBySeller(user.id);
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
    description: 'Product successfully created with image uploaded to Cloudinary',
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
    description:
      'User does not have seller role or is not the product owner',
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
    description:
      'User does not have seller role or is not the product owner',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.remove(id, user);
  }
}
