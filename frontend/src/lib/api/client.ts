import type { ApiPaginationMeta } from '@your-academy/shared';
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
  meta?: { requestId: string; pagination?: ApiPaginationMeta };
};

export type ApiResult<T> = {
  data: T;
  pagination?: ApiPaginationMeta;
  requestId?: string;
};

type FetchOptions = RequestInit & {
  /** Skip 401 → refresh → retry (auth endpoints, or already-retried calls). */
  skipRefresh?: boolean;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) {
    throw new ApiError('EMPTY_RESPONSE', 'Empty response from API', res.status);
  }
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('INVALID_JSON', 'API returned non-JSON response', res.status);
  }
}

function shouldAttemptRefresh(path: string, skipRefresh?: boolean): boolean {
  if (skipRefresh) return false;
  const p = path.split('?')[0];
  return ![
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].includes(p);
}

async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return false;
  const json = (await res.json()) as ApiEnvelope<unknown>;
  return Boolean(json.success);
}

export async function apiFetchResult<T>(
  path: string,
  init: FetchOptions = {},
): Promise<ApiResult<T>> {
  const { skipRefresh, ...requestInit } = init;
  const method = (requestInit.method ?? 'GET').toUpperCase();
  const headers = new Headers(requestInit.headers);
  if (!headers.has('Content-Type') && requestInit.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      ...requestInit,
      headers,
      credentials: 'include',
    });

  let res = await doFetch();

  if (res.status === 401 && shouldAttemptRefresh(path, skipRefresh)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      // Re-read CSRF — refresh rotates cookies.
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
        if (csrf) headers.set('X-CSRF-Token', csrf);
      }
      res = await doFetch();
    }
  }

  const json = await parseJson<T>(res);
  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.code ?? 'HTTP_ERROR',
      json.error?.message ?? 'Request failed',
      res.status,
    );
  }
  return {
    data: json.data as T,
    pagination: json.meta?.pagination,
    requestId: json.meta?.requestId,
  };
}

export async function apiFetch<T>(path: string, init: FetchOptions = {}): Promise<T> {
  const result = await apiFetchResult<T>(path, init);
  return result.data;
}

/** Absolute API origin for Server Components (bypasses browser cookies). */
export function serverApiBase(): string {
  const internal = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  return `${internal.replace(/\/$/, '')}/api/v1`;
}

export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${serverApiBase()}${path}`, {
      ...init,
      next: { revalidate: 60 },
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<T>;
    if (!json.success) return null;
    return (json.data as T) ?? null;
  } catch {
    return null;
  }
}
