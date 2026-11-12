export const UPLOAD_PURPOSES = [
  'avatar',
  'question-image',
  'news-cover',
  'pdf',
  'support-attachment',
] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

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
  bytes?: number;
  mimeType?: string;
  format?: string;
  width?: number;
  height?: number;
  originalFilename?: string;
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
