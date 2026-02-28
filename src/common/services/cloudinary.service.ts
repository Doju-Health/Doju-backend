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
