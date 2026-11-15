import { apiFetch } from '@/lib/api/client';

type SignResponse = {
  configured: boolean;
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
  purpose: string;
  resourceType: 'image' | 'raw';
  deliveryType: string;
  eager?: string;
};

export type UploadPurposeClient =
  | 'avatar'
  | 'question-image'
  | 'news-cover'
  | 'homepage-hero'
  | 'homepage-tile-logo'
  | 'pdf';

type MediaAsset = {
  id: string;
  publicId: string;
  bytes: number;
  mimeType: string;
  originalFilename?: string | null;
};

export async function getStorageStatus(): Promise<{ configured: boolean }> {
  return apiFetch<{ configured: boolean }>('/storage/status');
}

/**
 * Signed browser upload → Cloudinary → confirm MediaAsset.
 * Throws if Cloudinary is not configured on the API.
 */
export async function uploadViaSignedRequest(
  purpose: UploadPurposeClient,
  file: File,
): Promise<MediaAsset> {
  if (purpose === 'homepage-tile-logo') {
    assertHomepageTileLogoFile(file);
  }

  const sign = await apiFetch<SignResponse>('/storage/sign-upload', {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);
  if (sign.deliveryType && sign.deliveryType !== 'upload') {
    form.append('type', sign.deliveryType);
  }
  if (sign.eager) {
    form.append('eager', sign.eager);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`;
  const uploaded = await fetch(endpoint, { method: 'POST', body: form });
  if (!uploaded.ok) {
    const text = await uploaded.text();
    throw new Error(`Cloudinary upload failed: ${text.slice(0, 200)}`);
  }
  const payload = (await uploaded.json()) as {
    public_id: string;
    bytes?: number;
    format?: string;
    width?: number;
    height?: number;
    resource_type?: string;
  };

  return apiFetch<MediaAsset>('/storage/confirm', {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      publicId: payload.public_id,
      resourceType: sign.resourceType,
      bytes: payload.bytes,
      format: payload.format,
      width: payload.width,
      height: payload.height,
      mimeType: file.type || undefined,
      originalFilename: file.name,
    }),
  });
}

const TILE_LOGO_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);

/** Client-side validation + basic SVG script rejection before upload. */
export function assertHomepageTileLogoFile(file: File): void {
  const mime = (file.type || '').toLowerCase();
  if (!TILE_LOGO_MIMES.has(mime)) {
    throw new Error('Logo must be PNG, JPG, JPEG, WebP, or SVG');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Logo must be 2MB or smaller');
  }
}

export async function sanitizeSvgFileIfNeeded(file: File): Promise<File> {
  if ((file.type || '').toLowerCase() !== 'image/svg+xml') return file;
  const text = await file.text();
  if (/<script[\s>]/i.test(text) || /on\w+\s*=/i.test(text) || /javascript:/i.test(text)) {
    throw new Error('SVG contains unsafe script content and was rejected');
  }
  // Strip script/foreignObject blocks as a light sanitize pass.
  const cleaned = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  return new File([cleaned], file.name, { type: 'image/svg+xml' });
}
