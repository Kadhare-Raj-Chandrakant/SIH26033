import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import 'multer';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('app.cloudinary.cloudName');
    const apiKey = this.configService.get<string>('app.cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('app.cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary successfully configured');
    } else {
      this.logger.warn('Cloudinary secrets are missing. Media uploads will fail gracefully.');
    }
  }

  async uploadImage(file: Express.Multer.File, folder: string = 'products'): Promise<UploadApiResponse> {
    if (!this.isConfigured) {
      this.logger.error('Attempted to upload an image but Cloudinary is not configured.');
      // Return a dummy response for development when secrets are missing, so E2E tests and local dev don't crash
      // But only in development/test. In production, we should throw.
      const nodeEnv = this.configService.get<string>('app.nodeEnv');
      if (nodeEnv !== 'production') {
        this.logger.warn('Returning mock upload response for development.');
        return {
          public_id: `mock-${Date.now()}`,
          secure_url: `https://mock-image-url.com/mock-${Date.now()}.jpg`,
        } as UploadApiResponse;
      }
      throw new InternalServerErrorException('Media upload service is not configured');
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error || !result) {
              this.logger.error('Cloudinary upload failed', error);
              return reject(new InternalServerErrorException('Failed to upload image'));
            }
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this.isConfigured) {
      return;
    }
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(`Failed to delete image ${publicId} from Cloudinary`, error);
      // We don't throw here to avoid blocking related database deletions.
    }
  }
}
