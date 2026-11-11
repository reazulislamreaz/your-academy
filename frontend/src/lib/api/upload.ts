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
    throw new ApiError('INVALID_JSON', 'API returned non-JSON response', res.status);
  }

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.code ?? 'HTTP_ERROR',
      json.error?.message ?? 'Upload failed',
      res.status,
    );
  }

  return { data: json.data as T, requestId: json.meta?.requestId };
}

export function adminDownloadUrl(path: string): string {
  return `${API_BASE}${path}`;
}
