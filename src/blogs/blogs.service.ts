import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog, BlogStatus } from './entities/blog.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogsService {
  constructor(@InjectRepository(Blog) private readonly blogRepo: Repository<Blog>) {}

  async create(dto: CreateBlogDto): Promise<Blog> {
    const slug = this.toSlug(dto.title);
    await this.ensureSlugAvailable(slug);

    const blog = this.blogRepo.create({
      ...dto,
      slug,
      status: dto.status ?? BlogStatus.DRAFT,
      publishedAt: dto.status === BlogStatus.PUBLISHED ? new Date() : null,
    });
    return this.blogRepo.save(blog);
  }

  async findAll(page = 1, limit = 10) {
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 10)));
    const [data, total] = await this.blogRepo.findAndCount({
      where: { status: BlogStatus.PUBLISHED },
      order: { publishedAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOneBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogRepo.findOne({
      where: { slug, status: BlogStatus.PUBLISHED },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  async update(id: string, dto: UpdateBlogDto): Promise<Blog> {
    const blog = await this.blogRepo.findOne({ where: { id } });
    if (!blog) throw new NotFoundException('Blog not found');

    const nextSlug = dto.title !== undefined && dto.title !== blog.title
      ? this.toSlug(dto.title)
      : blog.slug;
    if (nextSlug !== blog.slug) await this.ensureSlugAvailable(nextSlug, id);

    const wasPublished = blog.status === BlogStatus.PUBLISHED;
    Object.assign(blog, dto, { slug: nextSlug });
    if (dto.status === BlogStatus.PUBLISHED && !wasPublished) {
      blog.publishedAt = new Date();
    } else if (dto.status === BlogStatus.DRAFT) {
      blog.publishedAt = null;
    }
    return this.blogRepo.save(blog);
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.blogRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Blog not found');
    return { message: 'Blog deleted successfully' };
  }

  private toSlug(value: string): string {
    const slug = value
      .normalize('NFKD')
      .toLowerCase()
      .trim()
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) throw new ConflictException('A valid blog slug could not be generated');
    return slug;
  }

  private async ensureSlugAvailable(slug: string, ignoreId?: string): Promise<void> {
    const existing = await this.blogRepo.findOne({ where: { slug } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('A blog with this slug already exists');
    }
  }
}
