import {
  ApiError,
  apiFetchResult,
  redirectToLoginAfterSessionExpired,
  type ApiResult,
} from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

/**
 * Multipart upload. Auth is the HTTP-only access cookie (`credentials: 'include'`),
 * not a Bearer header. Do not set Content-Type — the shared client leaves it unset
 * so the browser can add the multipart boundary without dropping CSRF or cookies.
 * A 401 refreshes the session once and retries; a dead refresh token goes to login.
 */
export async function apiUploadForm<T>(path: string, form: FormData): Promise<ApiResult<T>> {
  try {
    return await apiFetchResult<T>(path, {
      method: 'POST',
      body: form,
      timeoutMs: 120_000,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.code === 'UNAUTHORIZED')) {
      redirectToLoginAfterSessionExpired();
    }
    throw err;
  }
}

export function adminDownloadUrl(path: string): string {
  return `${API_BASE}${path}`;
}
