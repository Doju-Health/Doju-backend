import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

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
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.blogsService.findAll(Number(page) || 1, Number(limit) || 10);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published blog by slug' })
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
