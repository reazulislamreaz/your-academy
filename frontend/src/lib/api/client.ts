import { getCookie } from '../utils';

/** Prefer same-origin `/api/v1` (Next rewrite) so cookies + CSRF work locally. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success) {
    throw new ApiError(json.error?.code ?? 'HTTP_ERROR', json.error?.message ?? 'Request failed', res.status);
  }
  return json.data as T;
}
