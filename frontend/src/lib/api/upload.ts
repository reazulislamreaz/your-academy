import { getCookie } from '../utils';
import { ApiError, type ApiResult } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown[] };
  meta?: { requestId: string };
};

/** Multipart upload helper (do not set Content-Type — browser sets boundary). */
export async function apiUploadForm<T>(path: string, form: FormData): Promise<ApiResult<T>> {
  const headers = new Headers();
  const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
  if (csrf) headers.set('X-CSRF-Token', csrf);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: form,
  });

  const text = await res.text();
  let json: ApiEnvelope<T>;
  try {
    json = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    const hint =
      res.status === 413
        ? 'File is too large for the server'
        : res.status === 502 || res.status === 504
          ? 'API gateway error — try again in a moment'
          : res.status >= 500
            ? 'Server error while uploading'
            : 'Upload failed with a non-JSON response';
    throw new ApiError('INVALID_JSON', `${hint} (HTTP ${res.status})`, res.status);
  }

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.code ?? 'HTTP_ERROR',
      json.error?.message ?? `Upload failed (HTTP ${res.status})`,
      res.status,
    );
  }

  return { data: json.data as T, requestId: json.meta?.requestId };
}

export function adminDownloadUrl(path: string): string {
  return `${API_BASE}${path}`;
}
