import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MediaDeliveryType, MediaResourceType, UserRole } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import type { ConfirmUploadInput, SignedUploadParams, UploadPurpose } from './storage.types';
import { SUPPORT_ATTACHMENT_MIMES, UPLOAD_PURPOSES } from './storage.types';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly prisma: PrismaService) {
    if (this.isConfigured()) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  isConfigured(): boolean {
    const name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const key = process.env.CLOUDINARY_API_KEY?.trim();
    const secret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!name || !key || !secret) return false;
    // Reject obvious placeholders from .env.example
    if (name === 'demo' || key === 'demo' || secret === 'demo_secret_change_me') return false;
    return secret.length >= 16;
  }

  createSignedUploadParams(purposeRaw: string, user: RequestUser): SignedUploadParams {
    const purpose = this.assertPurpose(purposeRaw);
    this.assertPurposeAllowed(purpose, user);

    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        createErrorResponse(
          'STORAGE_NOT_CONFIGURED',
          'Cloudinary is not configured. Set CLOUDINARY_* credentials to enable uploads.',
          newRequestId(),
        ),
      );
    }

    const folder = `${process.env.CLOUDINARY_FOLDER_PREFIX ?? 'your-academy'}/${purpose}/${user.userId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const resourceType =
      purpose === 'pdf' || purpose === 'support-attachment' ? 'raw' : 'image';
    // PDFs, avatars, and support files use authenticated delivery.
    const deliveryType =
      purpose === 'pdf' || purpose === 'avatar' || purpose === 'support-attachment'
        ? 'authenticated'
        : 'upload';

    const toSign: Record<string, string | number> = {
      folder,
      timestamp,
    };
    if (deliveryType !== 'upload') {
      toSign.type = deliveryType;
    }
    const signature = cloudinary.utils.api_sign_request(
      toSign,
      process.env.CLOUDINARY_API_SECRET as string,
    );

    return {
      configured: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
      apiKey: process.env.CLOUDINARY_API_KEY as string,
      folder,
      timestamp,
      signature,
      purpose,
      resourceType,
      deliveryType,
    };
  }

  async confirmUpload(user: RequestUser, input: ConfirmUploadInput) {
    const purpose = this.assertPurpose(input.purpose);
    this.assertPurposeAllowed(purpose, user);

    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        createErrorResponse(
          'STORAGE_NOT_CONFIGURED',
          'Cloudinary is not configured',
          newRequestId(),
        ),
      );
    }

    const prefix = `${process.env.CLOUDINARY_FOLDER_PREFIX ?? 'your-academy'}/${purpose}/${user.userId}`;
    if (!input.publicId.startsWith(prefix)) {
      throw new ForbiddenException(
        createErrorResponse(
          'INVALID_PUBLIC_ID',
          'Upload public_id does not match signed folder',
          newRequestId(),
        ),
      );
    }

    const resourceType = (input.resourceType ??
      (purpose === 'pdf' || purpose === 'support-attachment' ? 'raw' : 'image')) as
      | 'image'
      | 'raw';

    let remote: {
      bytes?: number;
      format?: string;
      width?: number;
      height?: number;
      resource_type?: string;
      type?: string;
    };
    try {
      remote = await cloudinary.api.resource(input.publicId, { resource_type: resourceType });
    } catch (err) {
      this.logger.warn(`Cloudinary confirm failed for ${input.publicId}: ${String(err)}`);
      throw new BadRequestException(
        createErrorResponse(
          'ASSET_NOT_FOUND',
          'Cloudinary asset not found or not yet available',
          newRequestId(),
        ),
      );
    }

    const mimeType =
      input.mimeType ??
      (resourceType === 'raw'
        ? 'application/pdf'
        : `image/${remote.format ?? input.format ?? 'jpeg'}`);

    this.assertMimeForPurpose(purpose, mimeType);

    const deliveryType =
      remote.type === 'authenticated'
        ? MediaDeliveryType.AUTHENTICATED
        : remote.type === 'private'
          ? MediaDeliveryType.PRIVATE
          : MediaDeliveryType.UPLOAD;

    return this.prisma.mediaAsset.create({
      data: {
        publicId: input.publicId,
        resourceType: resourceType === 'raw' ? MediaResourceType.RAW : MediaResourceType.IMAGE,
        deliveryType,
        format: remote.format ?? input.format,
        bytes: remote.bytes ?? input.bytes ?? 0,
        mimeType,
        width: remote.width ?? input.width,
        height: remote.height ?? input.height,
        originalFilename: input.originalFilename,
        uploadedById: user.userId,
      },
    });
  }

  async generateSignedDownloadUrl(
    publicId: string,
    opts: { resourceType?: 'image' | 'raw'; deliveryType?: MediaDeliveryType; ttlSeconds?: number },
  ): Promise<string | null> {
    if (!this.isConfigured()) return null;

    const ttl = opts.ttlSeconds ?? 120;
    const resourceType = opts.resourceType ?? 'raw';
    const type =
      opts.deliveryType === MediaDeliveryType.PRIVATE
        ? 'private'
        : opts.deliveryType === MediaDeliveryType.AUTHENTICATED
          ? 'authenticated'
          : 'upload';

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type,
      secure: true,
      sign_url: type !== 'upload',
      expires_at: type === 'upload' ? undefined : Math.floor(Date.now() / 1000) + ttl,
      flags: resourceType === 'raw' ? 'attachment' : undefined,
    });
  }

  async deleteRemote(publicId: string, resourceType: 'image' | 'raw' = 'image') {
    if (!this.isConfigured()) return;
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${String(err)}`);
    }
  }

  private assertPurpose(purpose: string): UploadPurpose {
    if (!UPLOAD_PURPOSES.includes(purpose as UploadPurpose)) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_PURPOSE',
          `purpose must be one of: ${UPLOAD_PURPOSES.join(', ')}`,
          newRequestId(),
        ),
      );
    }
    return purpose as UploadPurpose;
  }

  private assertPurposeAllowed(purpose: UploadPurpose, user: RequestUser) {
    if (purpose === 'avatar' || purpose === 'support-attachment') return;
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        createErrorResponse(
          'FORBIDDEN',
          'Only admins can upload this asset type',
          newRequestId(),
        ),
      );
    }
  }

  /** Guest support uploads — folder keyed by guest session id (no User FK). */
  createGuestSupportUploadParams(guestSessionId: string): SignedUploadParams {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        createErrorResponse(
          'STORAGE_NOT_CONFIGURED',
          'Cloudinary is not configured. Set CLOUDINARY_* credentials to enable uploads.',
          newRequestId(),
        ),
      );
    }
    const purpose: UploadPurpose = 'support-attachment';
    const folder = `${process.env.CLOUDINARY_FOLDER_PREFIX ?? 'your-academy'}/${purpose}/guest-${guestSessionId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign: Record<string, string | number> = {
      folder,
      timestamp,
      type: 'authenticated',
    };
    const signature = cloudinary.utils.api_sign_request(
      toSign,
      process.env.CLOUDINARY_API_SECRET as string,
    );
    return {
      configured: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME as string,
      apiKey: process.env.CLOUDINARY_API_KEY as string,
      folder,
      timestamp,
      signature,
      purpose,
      resourceType: 'raw',
      deliveryType: 'authenticated',
    };
  }

  async confirmGuestSupportUpload(guestSessionId: string, input: ConfirmUploadInput) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        createErrorResponse('STORAGE_NOT_CONFIGURED', 'Cloudinary is not configured', newRequestId()),
      );
    }
    const purpose: UploadPurpose = 'support-attachment';
    const prefix = `${process.env.CLOUDINARY_FOLDER_PREFIX ?? 'your-academy'}/${purpose}/guest-${guestSessionId}`;
    if (!input.publicId.startsWith(prefix)) {
      throw new ForbiddenException(
        createErrorResponse(
          'INVALID_PUBLIC_ID',
          'Upload public_id does not match signed folder',
          newRequestId(),
        ),
      );
    }
    const resourceType = (input.resourceType ?? 'raw') as 'image' | 'raw';
    let remote: { bytes?: number; format?: string; width?: number; height?: number; type?: string };
    try {
      remote = await cloudinary.api.resource(input.publicId, { resource_type: resourceType });
    } catch (err) {
      this.logger.warn(`Cloudinary confirm failed for ${input.publicId}: ${String(err)}`);
      throw new BadRequestException(
        createErrorResponse(
          'ASSET_NOT_FOUND',
          'Cloudinary asset not found or not yet available',
          newRequestId(),
        ),
      );
    }
    const mimeType = input.mimeType ?? 'application/octet-stream';
    this.assertMimeForPurpose(purpose, mimeType);
    return this.prisma.mediaAsset.create({
      data: {
        publicId: input.publicId,
        resourceType: resourceType === 'raw' ? MediaResourceType.RAW : MediaResourceType.IMAGE,
        deliveryType: MediaDeliveryType.AUTHENTICATED,
        format: remote.format ?? input.format,
        bytes: remote.bytes ?? input.bytes ?? 0,
        mimeType,
        width: remote.width ?? input.width,
        height: remote.height ?? input.height,
        originalFilename: input.originalFilename,
        uploadedById: null,
      },
    });
  }

  private assertMimeForPurpose(purpose: UploadPurpose, mimeType: string) {
    const normalized = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
    const imageOk = ['image/jpeg', 'image/png', 'image/webp'].includes(normalized);
    const pdfOk = normalized === 'application/pdf';
    const supportOk = (SUPPORT_ATTACHMENT_MIMES as readonly string[]).includes(normalized);

    const allowed =
      purpose === 'pdf'
        ? pdfOk
        : purpose === 'support-attachment'
          ? supportOk
          : purpose === 'avatar' || purpose === 'question-image' || purpose === 'news-cover'
            ? imageOk
            : false;

    if (!allowed) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_MIME_TYPE',
          `MIME type ${mimeType} is not allowed for purpose ${purpose}`,
          newRequestId(),
        ),
      );
    }
  }
}
