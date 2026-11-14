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
};

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
  purpose: 'avatar' | 'question-image' | 'news-cover' | 'homepage-hero' | 'pdf',
  file: File,
): Promise<MediaAsset> {
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
