import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
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
    description: 'Retrieve all active healthcare equipment products from the marketplace',
  })
  @ApiOkResponse({
    description: 'Successfully retrieved all products',
    type: [ProductResponseDto],
  })
  getAll() {
    return this.productsService.findAll();
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
  @UseInterceptors(FileInterceptor('image'))
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create new product with image upload',
    description:
      'Create a new healthcare equipment product with optional image upload to Cloudinary. Requires seller role.',
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
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.productsService.create(dto, user, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(FileInterceptor('image'))
  @Patch(':id')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
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
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.productsService.update(id, dto, user, file);
  }
}
