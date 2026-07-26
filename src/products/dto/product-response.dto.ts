import { ApiProperty } from '@nestjs/swagger';

const PRODUCT_SIZES = ['small', 'medium', 'large'] as const;

export class ProductResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique product identifier',
  })
  id: string;

  @ApiProperty({
    example: 'Portable Oxygen Concentrator',
    description: 'Name of the product',
  })
  name: string;

  @ApiProperty({
    example:
      'High-quality portable oxygen concentrator with 2-hour battery life',
    description: 'Detailed product description',
  })
  description: string;

  @ApiProperty({
    example: 499.99,
    description: 'Product price in USD',
  })
  price: number;

  @ApiProperty({
    example: 50,
    description: 'Available stock quantity',
  })
  stock: number;

  @ApiProperty({
    enum: PRODUCT_SIZES,
    example: 'medium',
    description: 'Package size used for delivery pricing',
  })
  size: 'small' | 'medium' | 'large';

  @ApiProperty({
    example: {
      id: 'category-123',
      name: 'Respiratory Equipment',
      description: 'Respiratory care and monitoring equipment',
      imageUrl:
        'https://res.cloudinary.com/doju/image/upload/v1234567890/doju/categories/respiratory.jpg',
      isActive: true,
      createdAt: '2025-02-09T10:30:00Z',
      updatedAt: '2025-02-09T10:30:00Z',
    },
    description: 'Product category information',
  })
  category: {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  @ApiProperty({
    example: [
      'https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-1.jpg',
      'https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/product-2.jpg',
    ],
    description: 'Product image URLs from Cloudinary',
    nullable: true,
  })
  imageUrl?: string[];

  @ApiProperty({
    example: {
      id: 'user-123',
      fullName: 'John Doe',
      email: 'john@example.com',
    },
    description: 'Seller information',
  })
  seller: {
    id: string;
    fullName: string;
    email: string;
  };

  @ApiProperty({
    example: true,
    description: 'Product active status',
  })
  isActive: boolean;

  @ApiProperty({
    example: false,
    description: 'Product approval status',
  })
  isApproved: boolean;

  @ApiProperty({
    example: 'Images were too blurry to verify the product',
    description: 'Reason provided when the product is rejected',
    nullable: true,
  })
  rejectionReason?: string | null;

  @ApiProperty({
    example: 4.8,
    description: 'Average rating for the product',
  })
  averageRating: number;

  @ApiProperty({
    example: 12,
    description: 'Total number of ratings received',
  })
  ratingsCount: number;

  @ApiProperty({
    example: '2025-02-09T10:30:00Z',
    description: 'Product creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-02-09T10:30:00Z',
    description: 'Product last update timestamp',
  })
  updatedAt: Date;
}
