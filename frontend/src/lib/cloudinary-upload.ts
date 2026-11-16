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

export type UploadProgressPhase = 'signing' | 'uploading' | 'confirming';

export type UploadProgress = {
  phase: UploadProgressPhase;
  /** Overall 0–100 across sign → transfer → confirm. */
  percent: number;
  loaded?: number;
  total?: number;
};

export type UploadOptions = {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
};

/** Must stay aligned with backend `PDF_MAX_BYTES`. */
export const PDF_MAX_BYTES = 40 * 1024 * 1024;

/** Cloudinary requires chunks ≥ 5MB except the final chunk. */
const CLOUDINARY_CHUNK_SIZE = 6 * 1024 * 1024;

/** Use chunked upload above this size for reliability + smoother progress. */
const CHUNK_THRESHOLD_BYTES = 8 * 1024 * 1024;

type CloudinaryUploadResult = {
  public_id: string;
  bytes?: number;
  format?: string;
  width?: number;
  height?: number;
  resource_type?: string;
  type?: string;
  etag?: string;
  done?: boolean;
};

export async function getStorageStatus(): Promise<{ configured: boolean }> {
  return apiFetch<{ configured: boolean }>('/storage/status');
}

/**
 * Signed browser upload → Cloudinary → confirm MediaAsset.
 * Large PDFs use Cloudinary chunked upload; all transfers report XHR progress.
 * Throws if Cloudinary is not configured on the API.
 */
export async function uploadViaSignedRequest(
  purpose: UploadPurposeClient,
  file: File,
  options: UploadOptions = {},
): Promise<MediaAsset> {
  const { onProgress, signal } = options;
  assertUploadFile(purpose, file);
  throwIfAborted(signal);

  onProgress?.({ phase: 'signing', percent: 2 });
  const sign = await apiFetch<SignResponse>('/storage/sign-upload', {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });
  throwIfAborted(signal);

  onProgress?.({ phase: 'uploading', percent: 5, loaded: 0, total: file.size });

  const endpoint = `https://api.cloudinary.com/v1_1/${sign.cloudName}/${sign.resourceType}/upload`;
  const useChunked = purpose === 'pdf' && file.size > CHUNK_THRESHOLD_BYTES;

  const payload = useChunked
    ? await uploadCloudinaryChunked(endpoint, sign, file, {
        signal,
        onByteProgress: (loaded, total) => {
          onProgress?.({
            phase: 'uploading',
            percent: mapUploadPercent(loaded, total),
            loaded,
            total,
          });
        },
      })
    : await uploadCloudinarySingle(endpoint, sign, file, {
        signal,
        onByteProgress: (loaded, total) => {
          onProgress?.({
            phase: 'uploading',
            percent: mapUploadPercent(loaded, total),
            loaded,
            total,
          });
        },
      });

  throwIfAborted(signal);
  onProgress?.({
    phase: 'confirming',
    percent: 94,
    loaded: file.size,
    total: file.size,
  });

  const asset = await apiFetch<MediaAsset>('/storage/confirm', {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      publicId: payload.public_id,
      resourceType: sign.resourceType,
      deliveryType:
        payload.type === 'authenticated' ||
        payload.type === 'private' ||
        payload.type === 'upload'
          ? payload.type
          : sign.deliveryType === 'authenticated' ||
              sign.deliveryType === 'private' ||
              sign.deliveryType === 'upload'
            ? sign.deliveryType
            : undefined,
      bytes: payload.bytes,
      format: payload.format,
      width: payload.width,
      height: payload.height,
      etag: payload.etag,
      mimeType: file.type || (purpose === 'pdf' ? 'application/pdf' : undefined),
      originalFilename: file.name,
    }),
  });

  onProgress?.({
    phase: 'confirming',
    percent: 100,
    loaded: file.size,
    total: file.size,
  });
  return asset;
}

function mapUploadPercent(loaded: number, total: number): number {
  if (!total) return 5;
  // Reserve 0–5 for signing and 94–100 for confirm.
  return 5 + Math.round((loaded / total) * 89);
}

function appendSignedFields(form: FormData, sign: SignResponse): void {
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
}

async function uploadCloudinarySingle(
  endpoint: string,
  sign: SignResponse,
  file: File,
  opts: {
    signal?: AbortSignal;
    onByteProgress?: (loaded: number, total: number) => void;
  },
): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  form.append('file', file);
  appendSignedFields(form, sign);
  return xhrFormUpload(endpoint, form, {
    signal: opts.signal,
    onProgress: (loaded, total) => opts.onByteProgress?.(loaded, total || file.size),
  });
}

async function uploadCloudinaryChunked(
  endpoint: string,
  sign: SignResponse,
  file: File,
  opts: {
    signal?: AbortSignal;
    onByteProgress?: (loaded: number, total: number) => void;
  },
): Promise<CloudinaryUploadResult> {
  const uploadId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let start = 0;
  let last: CloudinaryUploadResult | null = null;

  while (start < file.size) {
    throwIfAborted(opts.signal);
    const end = Math.min(start + CLOUDINARY_CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const form = new FormData();
    form.append('file', chunk, file.name);
    appendSignedFields(form, sign);

    const chunkStart = start;
    last = await xhrFormUpload(endpoint, form, {
      signal: opts.signal,
      headers: {
        'X-Unique-Upload-Id': uploadId,
        'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
      },
      onProgress: (loaded) => {
        opts.onByteProgress?.(chunkStart + loaded, file.size);
      },
    });
    start = end;
  }

  if (!last?.public_id) {
    throw new Error('Cloudinary chunked upload completed without a public_id');
  }
  opts.onByteProgress?.(file.size, file.size);
  return last;
}

function xhrFormUpload(
  url: string,
  form: FormData,
  opts: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    onProgress?: (loaded: number, total: number) => void;
  } = {},
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'text';

    for (const [key, value] of Object.entries(opts.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };
    if (opts.signal) {
      if (opts.signal.aborted) {
        onAbort();
        return;
      }
      opts.signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!opts.onProgress) return;
      const total = event.lengthComputable ? event.total : 0;
      opts.onProgress(event.loaded, total);
    };

    xhr.onerror = () => {
      opts.signal?.removeEventListener('abort', onAbort);
      reject(new Error('Network error while uploading to Cloudinary'));
    };

    xhr.onload = () => {
      opts.signal?.removeEventListener('abort', onAbort);
      const text = xhr.responseText ?? '';
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Cloudinary upload failed: ${text.slice(0, 200)}`));
        return;
      }
      try {
        resolve(JSON.parse(text) as CloudinaryUploadResult);
      } catch {
        reject(new Error('Cloudinary returned invalid JSON'));
      }
    };

    xhr.send(form);
  });
}

function assertUploadFile(purpose: UploadPurposeClient, file: File): void {
  if (purpose === 'homepage-tile-logo') {
    assertHomepageTileLogoFile(file);
    return;
  }
  if (purpose === 'pdf') {
    assertPdfFile(file);
  }
}

/** Client-side PDF checks before starting a signed upload. */
export function assertPdfFile(file: File): void {
  const mime = (file.type || '').toLowerCase();
  const nameOk = file.name.toLowerCase().endsWith('.pdf');
  const mimeOk = !mime || mime === 'application/pdf';
  if (!mimeOk || !nameOk) {
    throw new Error('Only PDF files are allowed');
  }
  if (file.size < 1) {
    throw new Error('File is empty');
  }
  if (file.size > PDF_MAX_BYTES) {
    throw new Error('PDF must be 40MB or smaller');
  }
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

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Upload aborted', 'AbortError');
  }
}
