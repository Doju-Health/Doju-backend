import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlogStatus } from '../entities/blog.entity';

export class CreateBlogDto {
  @ApiProperty({ maxLength: 200, example: 'Choosing the Right Medical Equipment' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ maxLength: 220, example: 'choosing-the-right-medical-equipment' })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @ApiPropertyOptional({ example: 'A short summary of the article.' })
  @IsOptional()
  @ApiProperty({ example: 'Full blog article content goes here.' })
  @IsString()
  excerpt?: string;

  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: 'https://example.com/blog-cover.jpg' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ enum: BlogStatus, default: BlogStatus.DRAFT, description: 'Use "published" to publish immediately; defaults to "draft".' })
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;
}
