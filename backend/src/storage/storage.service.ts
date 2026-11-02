import { Injectable, Logger } from '@nestjs/common';

export interface StoredObject {
  publicId: string;
  resourceType: 'IMAGE' | 'RAW' | 'VIDEO' | 'AUTO';
  deliveryType: 'UPLOAD' | 'PRIVATE' | 'AUTHENTICATED';
  format?: string;
  bytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  originalFilename?: string;
}

/**
 * Cloudinary-backed later. Phase 6 stub returns signed-upload shape without secrets.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  createSignedUploadParams(purpose: string, userId: string) {
    const folder = `${process.env.CLOUDINARY_FOLDER_PREFIX ?? 'your-academy'}/${purpose}`;
    const timestamp = Math.floor(Date.now() / 1000);
    this.logger.debug(`Signed upload requested by ${userId} for ${purpose}`);
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? 'demo',
      apiKey: process.env.CLOUDINARY_API_KEY ?? 'demo',
      folder,
      timestamp,
      // Real signature computed with API secret in production Cloudinary module.
      signature: 'unsigned-dev-placeholder',
      purpose,
    };
  }
}
