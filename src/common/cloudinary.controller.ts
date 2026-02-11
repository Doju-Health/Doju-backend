import {
  Controller,
  Post,
  Delete,
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
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { CloudinaryService } from './services/cloudinary.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

@ApiTags('Cloudinary - Image Management')
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload image to Cloudinary',
    description:
      'Upload an image file to Cloudinary cloud storage. Returns the secure URL of the uploaded image.',
  })
  @ApiCreatedResponse({
    description: 'Image successfully uploaded to Cloudinary',
    schema: {
      example: {
        url: 'https://res.cloudinary.com/doju/image/upload/v1234567890/doju/products/image.jpg',
        message: 'Image uploaded successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'No file provided or invalid file format',
    schema: {
      example: {
        message: 'No file provided',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(file);
    return {
      url,
      message: 'Image uploaded successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:publicId')
  @ApiBearerAuth()
  @ApiParam({
    name: 'publicId',
    description:
      'The Cloudinary public ID of the image to delete (path format: doju/products/filename)',
    example: 'doju/products/product-image-123',
  })
  @ApiOperation({
    summary: 'Delete image from Cloudinary',
    description:
      'Delete an image from Cloudinary cloud storage by its public ID.',
  })
  @ApiOkResponse({
    description: 'Image successfully deleted from Cloudinary',
    schema: {
      example: {
        message: 'Image deleted successfully',
        publicId: 'doju/products/product-image-123',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Image deletion failed',
    schema: {
      example: {
        message: 'Image deletion failed: Resource not found',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  async delete(@Param('publicId') publicId: string) {
    await this.cloudinaryService.deleteImage(publicId);
    return {
      message: 'Image deleted successfully',
      publicId,
    };
  }
}
