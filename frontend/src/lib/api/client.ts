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
    throw new ApiError(
      'EMPTY_RESPONSE',
      res.status >= 500
        ? 'API returned an empty error response — the backend may be restarting. Retry in a moment.'
        : 'Empty response from API',
      res.status,
    );
  }
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    const hint =
      res.status === 413
        ? 'Request body too large'
        : res.status === 502 || res.status === 504
          ? 'API gateway / proxy error — backend may be down or restarting'
          : res.status >= 500
            ? 'Backend returned a non-JSON error page'
            : 'API returned non-JSON response';
    throw new ApiError('INVALID_JSON', `${hint} (HTTP ${res.status})`, res.status);
  }
}

const SESSION_EXPIRED_REASON = 'session-expired';

/**
 * Access JWTs are HTTP-only cookies (DEC-012), so callers cannot attach
 * `Authorization` themselves. When refresh also fails, leave the admin form
 * instead of a stuck 401 banner.
 */
export function redirectToLoginAfterSessionExpired(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path === '/login' || path.startsWith('/login/')) return;
  const params = new URLSearchParams();
  params.set('reason', SESSION_EXPIRED_REASON);
  const next = `${path}${window.location.search}`;
  if (next.startsWith('/') && !next.startsWith('/login')) {
    params.set('next', next);
  }
  window.location.assign(`/login?${params.toString()}`);
}

export function isSessionExpiredLoginReason(reason: string | null): boolean {
  return reason === SESSION_EXPIRED_REASON;
}

export const SESSION_REPLACED_REASON = 'session-replaced';
let sessionReplacedHandled = false;

/**
 * One device at a time (DEC-053): a newer login elsewhere revoked this session.
 * Clear the stale cookies, then show the login page with the explanation.
 */
export function handleSessionReplaced(): void {
  if (typeof window === 'undefined' || sessionReplacedHandled) return;
  sessionReplacedHandled = true;
  const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
  const go = () => window.location.assign(`/login?reason=${SESSION_REPLACED_REASON}`);
  void fetch(`${API_BASE}/auth/session/clear`, {
    method: 'POST',
    credentials: 'include',
    headers: csrf ? { 'X-CSRF-Token': csrf } : {},
  })
    .catch(() => undefined)
    .finally(go);
}

/** Admin issued a temporary password: everything else is refused until it is changed. */
function handlePasswordChangeRequired(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/change-password')) return;
  window.location.assign('/change-password');
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
    '/auth/session/clear',
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
let refreshInFlight: Promise<boolean | 'replaced'> | null = null;
let refreshCooldownUntil = 0;

function isFormDataBody(body: BodyInit | null | undefined): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

/**
 * A manual `Content-Type: multipart/form-data` omits the boundary and must not
 * replace cookie auth. Leave the header unset so the browser sets the boundary.
 * `credentials: 'include'` sends the HTTP-only access cookie.
 */
function applyBodyHeaders(headers: Headers, body: BodyInit | null | undefined): void {
  if (!body) return;
  if (isFormDataBody(body)) {
    headers.delete('Content-Type');
    return;
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
}

/** FormData can be read only once by some fetch implementations — copy per attempt. */
function cloneBody(body: BodyInit | null | undefined): BodyInit | null | undefined {
  if (!isFormDataBody(body)) return body;
  const copy = new FormData();
  for (const [key, value] of body.entries()) {
    copy.append(key, value);
  }
  return copy;
}

/** True for `403 CONTENT_LOCKED` whose detail says the viewer looked signed out. */
async function peekLoginRequiredLock(res: Response): Promise<boolean> {
  try {
    const body = (await res.clone().json()) as {
      error?: { code?: string; details?: Array<{ loginRequired?: boolean }> };
    };
    return body.error?.code === 'CONTENT_LOCKED' && body.error.details?.[0]?.loginRequired === true;
  } catch {
    return false;
  }
}

/** Read an error code without consuming the body the caller will parse later. */
async function peekErrorCode(res: Response): Promise<string | undefined> {
  try {
    const body = (await res.clone().json()) as ApiEnvelope<unknown>;
    return body.error?.code;
  } catch {
    return undefined;
  }
}

async function refreshSession(): Promise<boolean | 'replaced'> {
  if (!likelyHasSessionCookies()) return false;
  if (Date.now() < refreshCooldownUntil) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.status === 401) {
        const body = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null;
        if (body?.error?.code === 'SESSION_REPLACED') return 'replaced';
      }
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
  applyBodyHeaders(headers, requestInit.body);

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }

  const doFetch = async () => {
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timer =
      controller && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    // Honour caller abort + our timeout.
    const onCallerAbort = () => controller?.abort();
    if (signal) {
      if (signal.aborted) controller?.abort();
      else signal.addEventListener('abort', onCallerAbort, { once: true });
    }
    try {
      return await fetch(`${API_BASE}${path}`, {
        ...requestInit,
        body: cloneBody(requestInit.body),
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

  const replacedNow = res.status === 401 && (await peekErrorCode(res)) === 'SESSION_REPLACED';
  // Public routes read the session optionally: an expired access cookie looks like a guest
  // and gets a "log in" lock (DEC-060/061). With session cookies present, refresh once and retry.
  const staleLock =
    res.status === 403 &&
    likelyHasSessionCookies() &&
    (await peekLoginRequiredLock(res)) &&
    shouldAttemptRefresh(path, false);
  if (staleLock) {
    const refreshed = await refreshSession();
    if (refreshed === 'replaced') {
      handleSessionReplaced();
    } else if (refreshed) {
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
  } else if (replacedNow && shouldAttemptRefresh(path, skipRefresh)) {
    handleSessionReplaced();
  } else if (res.status === 401 && shouldAttemptRefresh(path, skipRefresh)) {
    const refreshed = await refreshSession();
    if (refreshed === 'replaced') {
      handleSessionReplaced();
    } else if (refreshed) {
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
    if (res.status === 403 && json.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
      handlePasswordChangeRequired();
    }
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
