import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogStatus } from './entities/blog.entity';

enum AdminBlogStatusFilter {
  ALL = 'all',
  DRAFT = BlogStatus.DRAFT,
  PUBLISHED = BlogStatus.PUBLISHED,
}

@ApiTags('Blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a blog (admin only)' })
  create(@Body() dto: CreateBlogDto) {
    return this.blogsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get published blogs with pagination' })
  @ApiOkResponse({
    description: 'Published blogs and pagination metadata.',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            slug: 'choosing-the-right-medical-equipment',
            title: 'Choosing the Right Medical Equipment',
            excerpt: 'A short guide to selecting medical equipment.',
            content: 'Full blog post content goes here.',
            coverImageUrl: 'https://example.com/blog-cover.jpg',
            status: 'published',
            publishedAt: '2026-10-12T10:00:00.000Z',
            createdAt: '2026-10-11T09:00:00.000Z',
            updatedAt: '2026-10-12T10:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    },
  })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.blogsService.findAll(Number(page) || 1, Number(limit) || 10);
  }

  @Get('admin/by-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get blogs by status (admin only)',
    description: 'Returns drafts, published blogs, or all blogs filtered by status, with pagination.',
  })
  @ApiQuery({ name: 'status', enum: AdminBlogStatusFilter, required: true })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Blogs matching the requested status and pagination metadata.',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            slug: 'choosing-the-right-medical-equipment',
            title: 'Choosing the Right Medical Equipment',
            excerpt: 'A short guide to selecting medical equipment.',
            content: 'Full blog post content goes here.',
            coverImageUrl: 'https://example.com/blog-cover.jpg',
            status: 'published',
            publishedAt: '2026-10-12T10:00:00.000Z',
            createdAt: '2026-10-11T09:00:00.000Z',
            updatedAt: '2026-10-11T09:00:00.000Z',
          },
          {
            id: '223e4567-e89b-12d3-a456-426614174000',
            slug: 'draft-medical-equipment-guide',
            title: 'Draft Medical Equipment Guide',
            excerpt: 'A draft article for admin review.',
            content: 'Draft blog content goes here.',
            coverImageUrl: null,
            status: 'draft',
            publishedAt: null,
            createdAt: '2026-10-10T09:00:00.000Z',
            updatedAt: '2026-10-10T09:00:00.000Z',
          },
        ],
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      },
    },
  })
  findByStatus(
    @Query('status', new ParseEnumPipe(AdminBlogStatusFilter))
    status: AdminBlogStatusFilter,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.blogsService.findByStatus(
      status === AdminBlogStatusFilter.ALL
        ? 'all'
        : status === AdminBlogStatusFilter.DRAFT
          ? BlogStatus.DRAFT
          : BlogStatus.PUBLISHED,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a blog by ID (admin only)',
    description:
      'Returns a blog by UUID, including drafts. Optionally filter by its status.',
  })
  @ApiQuery({ name: 'status', enum: BlogStatus, required: false })
  @ApiOkResponse({
    description: 'The blog matching the ID and optional status.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'choosing-the-right-medical-equipment',
        title: 'Choosing the Right Medical Equipment',
        excerpt: 'A short guide to selecting medical equipment.',
        content: 'Full blog post content goes here.',
        coverImageUrl: 'https://example.com/blog-cover.jpg',
        status: 'draft',
        publishedAt: null,
        createdAt: '2026-10-11T09:00:00.000Z',
        updatedAt: '2026-10-11T09:00:00.000Z',
      },
    },
  })
  findOneById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('status', new ParseEnumPipe(BlogStatus, { optional: true }))
    status?: BlogStatus,
  ) {
    return this.blogsService.findOneById(id, status);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published blog by slug' })
  @ApiOkResponse({
    description: 'The published blog matching the slug.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'choosing-the-right-medical-equipment',
        title: 'Choosing the Right Medical Equipment',
        excerpt: 'A short guide to selecting medical equipment.',
        content: 'Full blog post content goes here.',
        coverImageUrl: 'https://example.com/blog-cover.jpg',
        status: 'published',
        publishedAt: '2026-10-12T10:00:00.000Z',
        createdAt: '2026-10-11T09:00:00.000Z',
        updatedAt: '2026-10-12T10:00:00.000Z',
      },
    },
  })
  findOne(@Param('slug') slug: string) {
    return this.blogsService.findOneBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edit or publish a blog (admin only)',
    description:
      'Set status to "published" to publish a draft and make it available through the public GET endpoints. Set status to "draft" to unpublish it. Publishing sets publishedAt.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBlogDto,
  ) {
    return this.blogsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a blog (admin only)' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.blogsService.remove(id);
  }
}
