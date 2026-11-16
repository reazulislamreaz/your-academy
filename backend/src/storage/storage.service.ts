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
import {
  HOMEPAGE_TILE_LOGO_EAGER,
  HOMEPAGE_TILE_LOGO_MAX_BYTES,
  HOMEPAGE_TILE_LOGO_MIMES,
  IMAGE_MAX_BYTES,
  PDF_MAX_BYTES,
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_MIMES,
  UPLOAD_PURPOSES,
} from './storage.types';

type CloudinaryResource = {
  bytes?: number;
  format?: string;
  width?: number;
  height?: number;
  type?: string;
  resource_type?: string;
  etag?: string;
};

const CONFIRM_LOOKUP_ATTEMPTS = 3;
const CONFIRM_LOOKUP_BACKOFF_MS = 120;

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

  createSignedUploadParams(
    purposeRaw: string,
    user: RequestUser,
    opts?: { resourceType?: 'image' | 'raw' },
  ): SignedUploadParams {
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
      purpose === 'support-attachment'
        ? opts?.resourceType === 'image'
          ? 'image'
          : 'raw'
        : purpose === 'pdf'
          ? 'raw'
          : 'image';
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
    // Backend-driven resize/optimize for homepage tile logos (Cloudinary eager).
    const eager = purpose === 'homepage-tile-logo' ? HOMEPAGE_TILE_LOGO_EAGER : undefined;
    if (eager) {
      toSign.eager = eager;
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
      eager,
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

    const preferredDelivery =
      input.deliveryType ??
      (purpose === 'pdf' || purpose === 'avatar' || purpose === 'support-attachment'
        ? 'authenticated'
        : 'upload');

    let remote: CloudinaryResource;
    try {
      remote = await this.fetchCloudinaryResource(input.publicId, resourceType, preferredDelivery);
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
    const bytes = remote.bytes ?? input.bytes ?? 0;
    this.assertBytesForPurpose(purpose, bytes);

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
        bytes,
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
    return this.buildSignedAssetUrl(publicId, { ...opts, forceAttachment: true });
  }

  /**
   * Short-lived signed URL for server-side fetch / inline viewing (no `attachment` flag).
   * Prefer proxying through the API instead of exposing this URL to browsers.
   */
  async generateSignedViewUrl(
    publicId: string,
    opts: { resourceType?: 'image' | 'raw'; deliveryType?: MediaDeliveryType; ttlSeconds?: number },
  ): Promise<string | null> {
    return this.buildSignedAssetUrl(publicId, { ...opts, forceAttachment: false });
  }

  /** Fetch asset bytes via a short-lived signed URL (API proxy use). */
  async fetchAssetBytes(
    publicId: string,
    opts: {
      resourceType?: 'image' | 'raw';
      deliveryType?: MediaDeliveryType;
      ttlSeconds?: number;
      /** Upstream fetch timeout (Cloudinary authenticated raw can be slow). */
      timeoutMs?: number;
    },
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const url = await this.generateSignedViewUrl(publicId, opts);
    if (!url) return null;
    const timeoutMs = opts.timeoutMs ?? 90_000;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        this.logger.warn(`Upstream asset fetch failed (${res.status}) for ${publicId}`);
        return null;
      }
      const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, contentType };
    } catch (err) {
      this.logger.warn(`Upstream asset fetch error for ${publicId}: ${String(err)}`);
      return null;
    }
  }

  private buildSignedAssetUrl(
    publicId: string,
    opts: {
      resourceType?: 'image' | 'raw';
      deliveryType?: MediaDeliveryType;
      ttlSeconds?: number;
      forceAttachment?: boolean;
    },
  ): string | null {
    if (!this.isConfigured()) return null;

    const ttl = opts.ttlSeconds ?? 120;
    const resourceType = opts.resourceType ?? 'raw';
    const type =
      opts.deliveryType === MediaDeliveryType.PRIVATE
        ? 'private'
        : opts.deliveryType === MediaDeliveryType.AUTHENTICATED
          ? 'authenticated'
          : 'upload';

    // Authenticated/private RAW: delivery `sign_url` URLs commonly 401 when the
    // public_id embeds an extension (e.g. `…/asset.pdf`). Use the Admin download
    // API instead — verified to return application/pdf for those assets.
    if (resourceType === 'raw' && type !== 'upload') {
      const hasExtension = /\.[a-z0-9]+$/i.test(publicId);
      return cloudinary.utils.private_download_url(
        publicId,
        // Empty format when extension is already part of public_id.
        hasExtension ? '' : 'pdf',
        {
          resource_type: 'raw',
          type,
          expires_at: Math.floor(Date.now() / 1000) + ttl,
          ...(opts.forceAttachment ? { attachment: true } : {}),
        },
      );
    }

    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type,
      secure: true,
      sign_url: type !== 'upload',
      expires_at: type === 'upload' ? undefined : Math.floor(Date.now() / 1000) + ttl,
      flags: opts.forceAttachment && resourceType === 'raw' ? 'attachment' : undefined,
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
  createGuestSupportUploadParams(
    guestSessionId: string,
    opts?: { resourceType?: 'image' | 'raw' },
  ): SignedUploadParams {
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
    const resourceType = opts?.resourceType === 'image' ? 'image' : 'raw';
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
      resourceType,
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
    const preferredDelivery = input.deliveryType ?? 'authenticated';
    let remote: CloudinaryResource;
    try {
      remote = await this.fetchCloudinaryResource(
        input.publicId,
        resourceType,
        preferredDelivery,
      );
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
    const format = (remote.format ?? input.format ?? '').toLowerCase();
    const mimeType =
      input.mimeType ??
      (resourceType === 'image'
        ? `image/${format || 'jpeg'}`
        : format === 'pdf'
          ? 'application/pdf'
          : format === 'txt'
            ? 'text/plain'
            : 'application/octet-stream');
    this.assertMimeForPurpose(purpose, mimeType);
    const bytes = remote.bytes ?? input.bytes ?? 0;
    this.assertBytesForPurpose(purpose, bytes);
    return this.prisma.mediaAsset.create({
      data: {
        publicId: input.publicId,
        resourceType: resourceType === 'raw' ? MediaResourceType.RAW : MediaResourceType.IMAGE,
        deliveryType: MediaDeliveryType.AUTHENTICATED,
        format: remote.format ?? input.format,
        bytes,
        mimeType,
        width: remote.width ?? input.width,
        height: remote.height ?? input.height,
        originalFilename: input.originalFilename,
        uploadedById: null,
      },
    });
  }

  /**
   * Fast Admin API lookup: preferred delivery + exact/stripped publicId first,
   * short retries only for post-upload propagation, then narrow delivery
   * fallbacks. Replaces the previous 2×5 sequential fan-out that dominated
   * confirm latency after large PDF uploads.
   */
  private async fetchCloudinaryResource(
    publicId: string,
    resourceType: 'image' | 'raw',
    preferredDelivery: 'upload' | 'authenticated' | 'private',
  ): Promise<CloudinaryResource> {
    const stripped = publicId.includes('.')
      ? publicId.replace(/\.[^./]+$/, '')
      : null;
    const preferredIds = stripped && stripped !== publicId ? [publicId, stripped] : [publicId];

    let lastErr: unknown;

    // 1) Preferred delivery — exact id, then extension-stripped (no backoff yet).
    for (const id of preferredIds) {
      try {
        return await cloudinary.api.resource(id, {
          resource_type: resourceType,
          type: preferredDelivery,
        });
      } catch (err) {
        lastErr = err;
      }
    }

    // 2) Brief retries for Admin API eventual consistency right after upload.
    for (let attempt = 1; attempt < CONFIRM_LOOKUP_ATTEMPTS; attempt++) {
      await sleep(CONFIRM_LOOKUP_BACKOFF_MS * attempt);
      try {
        return await cloudinary.api.resource(publicId, {
          resource_type: resourceType,
          type: preferredDelivery,
        });
      } catch (err) {
        lastErr = err;
      }
    }

    // 3) Last resort: other delivery types (rarely needed when client sends deliveryType).
    const otherTypes = uniqueStrings(['upload', 'authenticated', 'private']).filter(
      (t) => t !== preferredDelivery,
    );
    for (const id of preferredIds) {
      for (const type of otherTypes) {
        try {
          return await cloudinary.api.resource(id, {
            resource_type: resourceType,
            type,
          });
        } catch (err) {
          lastErr = err;
        }
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private assertMimeForPurpose(purpose: UploadPurpose, mimeType: string) {
    const normalized = mimeType.toLowerCase().split(';')[0]?.trim() ?? '';
    const imageOk = ['image/jpeg', 'image/png', 'image/webp'].includes(normalized);
    const tileLogoOk = (HOMEPAGE_TILE_LOGO_MIMES as readonly string[]).includes(normalized);
    const pdfOk = normalized === 'application/pdf';
    const supportOk = (SUPPORT_ATTACHMENT_MIMES as readonly string[]).includes(normalized);

    const allowed =
      purpose === 'pdf'
        ? pdfOk
        : purpose === 'support-attachment'
          ? supportOk
          : purpose === 'homepage-tile-logo'
            ? tileLogoOk
            : purpose === 'avatar' ||
                purpose === 'question-image' ||
                purpose === 'news-cover' ||
                purpose === 'homepage-hero'
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

  private assertBytesForPurpose(purpose: UploadPurpose, bytes: number) {
    const max =
      purpose === 'support-attachment'
        ? SUPPORT_ATTACHMENT_MAX_BYTES
        : purpose === 'homepage-tile-logo'
          ? HOMEPAGE_TILE_LOGO_MAX_BYTES
          : purpose === 'pdf'
            ? PDF_MAX_BYTES
            : IMAGE_MAX_BYTES;
    if (!Number.isFinite(bytes) || bytes < 1 || bytes > max) {
      throw new BadRequestException(
        createErrorResponse(
          'FILE_TOO_LARGE',
          `Upload exceeds the ${Math.round(max / (1024 * 1024))}MB limit for ${purpose}`,
          newRequestId(),
        ),
      );
    }
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
