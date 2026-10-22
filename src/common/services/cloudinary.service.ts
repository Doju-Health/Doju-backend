import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { Express } from 'express';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'doju/products',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadSingle(file, folder);
  }

  async uploadVerificationDocument(file: Express.Multer.File): Promise<{
    publicId: string;
    assetId: string;
    resourceType: string;
    format: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'doju/verification-documents',
            resource_type: 'auto',
            type: 'authenticated',
          },
          (error, result) => {
            if (error) {
              reject(new BadRequestException(`Upload failed: ${error.message}`));
              return;
            }

            if (!result?.public_id || !result.asset_id || !result.resource_type || !result.format) {
              reject(new BadRequestException('Upload failed: incomplete Cloudinary result'));
              return;
            }

            resolve({
              publicId: result.public_id,
              assetId: result.asset_id,
              resourceType: result.resource_type,
              format: result.format,
            });
          },
        );

        uploadStream.end(file.buffer);
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Verification document upload failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getVerificationDocumentDownloadUrl(
    publicId: string,
    resourceType: string,
    format: string,
  ): string {
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType as 'image' | 'raw' | 'video',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    });
  }

  async deleteVerificationDocument(
    publicId: string,
    resourceType: string,
  ): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType as 'image' | 'raw' | 'video',
      type: 'authenticated',
    });
  }

  async uploadImages(
    files: Express.Multer.File[],
    folder: string = 'doju/products',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return Promise.all(files.map((file) => this.uploadSingle(file, folder)));
  }

  private async uploadSingle(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(
                new BadRequestException(`Upload failed: ${error.message}`),
              );
              return;
            }

            if (!result) {
              reject(new BadRequestException('Upload failed: No result'));
              return;
            }

            resolve(result.secure_url);
          },
        );

        uploadStream.end(file.buffer);
      });
    } catch (error) {
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new BadRequestException(`Image deletion failed: ${error.message}`);
    }
  }
}
