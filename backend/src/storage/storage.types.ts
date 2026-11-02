export const UPLOAD_PURPOSES = ['avatar', 'question-image', 'news-cover', 'pdf'] as const;
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
