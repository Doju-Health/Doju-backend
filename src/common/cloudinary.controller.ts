import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from 'src/agents/entities/agent.entity';
import { Ambassador } from 'src/ambassadors/entities/ambassador.entity';
import { RolesGuard } from 'src/common/guards/role.guards';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/users/enums/user.enum';
import { CloudinaryService } from './services/cloudinary.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

@ApiTags('Cloudinary - Image Management')
@Controller('cloudinary')
export class CloudinaryController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Ambassador)
    private readonly ambassadorRepo: Repository<Ambassador>,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('verification-document/:applicantType/:applicationId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a short-lived link to an applicant verification document',
    description:
      'Use applicantType "agent" for an agent application or "ambassador" for an ambassador application.',
  })
  @ApiParam({
    name: 'applicantType',
    enum: ['agent', 'ambassador'],
    example: 'agent',
    description: 'Applicant type: agent or ambassador.',
  })
  @ApiParam({
    name: 'applicationId',
    example: '123',
    description: 'Application ID for the selected applicant type.',
  })
  async getVerificationDocument(
    @Param('applicantType') applicantType: string,
    @Param('applicationId') applicationId: string,
  ) {
    if (applicantType === 'agent') {
      const agentId = Number(applicationId);
      if (!Number.isSafeInteger(agentId)) {
        throw new BadRequestException('Invalid agent application ID');
      }
      const agent = await this.agentRepo.findOne({ where: { id: agentId } });
      if (!agent) throw new NotFoundException('Agent application not found');
      if (
        !agent.identityDocument ||
        !agent.identityDocumentFormat ||
        !agent.identityDocumentResourceType
      ) {
        throw new NotFoundException('Verification document not uploaded');
      }
      return {
        url: this.cloudinaryService.getVerificationDocumentDownloadUrl(
          agent.identityDocument,
          agent.identityDocumentResourceType,
          agent.identityDocumentFormat,
        ),
        expiresInSeconds: 300,
      };
    }

    if (applicantType === 'ambassador') {
      const ambassador = await this.ambassadorRepo.findOne({
        where: { id: applicationId },
      });
      if (!ambassador) {
        throw new NotFoundException('Ambassador application not found');
      }
      if (
        !ambassador.idCardPublicId ||
        !ambassador.idCardFormat ||
        !ambassador.idCardResourceType
      ) {
        throw new NotFoundException('Verification document not uploaded');
      }
      return {
        url: this.cloudinaryService.getVerificationDocumentDownloadUrl(
          ambassador.idCardPublicId,
          ambassador.idCardResourceType,
          ambassador.idCardFormat,
        ),
        expiresInSeconds: 300,
      };
    }

    throw new BadRequestException('applicantType must be agent or ambassador');
  }

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
  @UseInterceptors(FilesInterceptor('files', 10))
  @Post('upload-multiple')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload multiple images to Cloudinary',
    description:
      'Upload multiple image files to Cloudinary cloud storage. Returns secure URLs for all uploaded images.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        folder: {
          type: 'string',
          example: 'doju/products',
          description: 'Optional Cloudinary folder path',
        },
      },
      required: ['files'],
    },
  })
  @ApiCreatedResponse({
    description: 'Images successfully uploaded to Cloudinary',
    schema: {
      example: {
        urls: [
          'https://res.cloudinary.com/doju/image/upload/v123/doju/products/image-1.jpg',
          'https://res.cloudinary.com/doju/image/upload/v124/doju/products/image-2.jpg',
        ],
        count: 2,
        message: 'Images uploaded successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'No files provided or one/more uploads failed',
    schema: {
      example: {
        message: 'No files provided',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT token',
  })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    const urls = await this.cloudinaryService.uploadImages(files, folder);
    return {
      urls,
      count: urls.length,
      message: 'Images uploaded successfully',
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
