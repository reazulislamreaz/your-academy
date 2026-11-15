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
  /** Override default request timeout (ms). Set 0 to disable. */
  timeoutMs?: number;
};

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

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

/**
 * CSRF is readable and set only with auth cookies. No CSRF ≈ guest — skip refresh
 * so public pages do not stampede `/auth/refresh` (and hit 429) after `/users/me` 401s.
 */
function likelyHasSessionCookies(): boolean {
  return Boolean(getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token'));
}

/** Single-flight refresh + cooldown after failure (prevents throttle storms). */
let refreshInFlight: Promise<boolean> | null = null;
let refreshCooldownUntil = 0;

async function refreshSession(): Promise<boolean> {
  if (!likelyHasSessionCookies()) return false;
  if (Date.now() < refreshCooldownUntil) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        // 429: back off a full throttle window; other failures: short cool-down.
        refreshCooldownUntil = Date.now() + (res.status === 429 ? 65_000 : 15_000);
        return false;
      }
      const json = (await res.json()) as ApiEnvelope<unknown>;
      const ok = Boolean(json.success);
      if (!ok) refreshCooldownUntil = Date.now() + 15_000;
      else refreshCooldownUntil = 0;
      return ok;
    } catch {
      refreshCooldownUntil = Date.now() + 15_000;
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiFetchResult<T>(
  path: string,
  init: FetchOptions = {},
): Promise<ApiResult<T>> {
  const { skipRefresh, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...requestInit } = init;
  const method = (requestInit.method ?? 'GET').toUpperCase();
  const headers = new Headers(requestInit.headers);
  if (!headers.has('Content-Type') && requestInit.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const doFetch = async () => {
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timer =
      controller && timeoutMs > 0
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;
    // Honour caller abort + our timeout.
    const onCallerAbort = () => controller?.abort();
    if (signal) {
      if (signal.aborted) controller?.abort();
      else signal.addEventListener('abort', onCallerAbort, { once: true });
    }
    try {
      return await fetch(`${API_BASE}${path}`, {
        ...requestInit,
        headers,
        credentials: 'include',
        signal: controller?.signal ?? signal,
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'AbortError') {
        throw new ApiError('REQUEST_TIMEOUT', 'Request timed out. Please try again.', 408);
      }
      throw err;
    } finally {
      if (timer != null) clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onCallerAbort);
    }
  };

  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Network request failed',
      0,
    );
  }

  if (res.status === 401 && shouldAttemptRefresh(path, skipRefresh)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      // Re-read CSRF — refresh rotates cookies.
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
        if (csrf) headers.set('X-CSRF-Token', csrf);
      }
      try {
        res = await doFetch();
      } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(
          'NETWORK_ERROR',
          err instanceof Error ? err.message : 'Network request failed',
          0,
        );
      }
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
  const internal = process.env.API_INTERNAL_URL ?? 'http://localhost:5000';
  return `${internal.replace(/\/$/, '')}/api/v1`;
}
