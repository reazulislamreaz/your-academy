import type { DashboardPermission } from '@your-academy/shared';

export const UPLOAD_PURPOSES = [
  'avatar',
  'question-image',
  'news-cover',
  'homepage-hero',
  /** Square logos for homepage Question Bank / Topic Analysis tiles. */
  'homepage-tile-logo',
  'pdf',
  'support-attachment',
] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/**
 * Dashboard permission needed per upload purpose (DEC-048); `null` = any signed-in user.
 * Keeps moderator uploads (question images, newspaper PDFs) aligned with their sections.
 */
export const UPLOAD_PURPOSE_PERMISSIONS: Readonly<
  Record<UploadPurpose, readonly DashboardPermission[] | null>
> = {
  avatar: null,
  'support-attachment': null,
  'question-image': ['preli', 'written', 'topic', 'quiz', 'modelTest'],
  'news-cover': ['newspaper'],
  pdf: ['newspaper'],
  'homepage-hero': ['homepage'],
  'homepage-tile-logo': ['homepage'],
};

/** Cloudinary eager transform: fit into 256×256, auto format/quality (backend resize). */
export const HOMEPAGE_TILE_LOGO_EAGER = 'c_fit,w_256,h_256,q_auto:good,f_auto';

export const HOMEPAGE_TILE_LOGO_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
] as const;

export const HOMEPAGE_TILE_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type SignedUploadParams = {
  configured: boolean;
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
  purpose: UploadPurpose;
  resourceType: 'image' | 'raw';
  deliveryType: 'upload' | 'authenticated' | 'private';
  eager?: string;
};

export type ConfirmUploadInput = {
  purpose: UploadPurpose;
  publicId: string;
  resourceType?: 'image' | 'raw';
  /** Delivery type reported by Cloudinary upload response (`type` field). */
  deliveryType?: 'upload' | 'authenticated' | 'private';
  bytes?: number;
  mimeType?: string;
  format?: string;
  width?: number;
  height?: number;
  originalFilename?: string;
  /** Optional Cloudinary etag from upload response (integrity hint). */
  etag?: string;
};

export const SUPPORT_ATTACHMENT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
] as const;

export const SUPPORT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

/** PDF / document uploads (admin signed Cloudinary raw). */
export const PDF_MAX_BYTES = 40 * 1024 * 1024;

/** Default max for image purposes (avatar / covers / heroes). */
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
