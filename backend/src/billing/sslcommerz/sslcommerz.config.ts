/**
 * DEC-060 — SSLCommerz settings, from environment variables only. `null` when the store
 * credentials are missing: checkout answers PAYMENT_NOT_CONFIGURED instead of crashing.
 */
export type SslcommerzConfig = {
  storeId: string;
  storePassword: string;
  isLive: boolean;
  /** https://securepay.sslcommerz.com or https://sandbox.sslcommerz.com */
  gatewayBaseUrl: string;
  /** Public API origin the gateway posts back to (…/api/v1/payments/sslcommerz/*). */
  callbackBaseUrl: string;
  /** Public web origin learners are redirected to after a callback. */
  webBaseUrl: string;
  timeoutMs: number;
};

export const SSLCZ_LIVE_URL = 'https://securepay.sslcommerz.com';
export const SSLCZ_SANDBOX_URL = 'https://sandbox.sslcommerz.com';

const trimSlash = (s: string) => s.replace(/\/+$/, '');

/** Web origin for result pages; also used when payments are not configured. */
export function getWebBaseUrl(): string {
  const explicit = process.env.APP_PUBLIC_URL?.trim();
  if (explicit) return trimSlash(explicit);
  const first = (process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .find(Boolean);
  return trimSlash(first ?? 'http://localhost:3000');
}

export function getSslcommerzConfig(): SslcommerzConfig | null {
  const storeId = process.env.SSLCZ_STORE_ID?.trim();
  const storePassword = process.env.SSLCZ_STORE_PASSWORD?.trim();
  if (!storeId || !storePassword) return null;
  const isLive = process.env.SSLCZ_IS_LIVE?.trim().toLowerCase() === 'true';
  const apiBase = trimSlash(
    process.env.API_PUBLIC_URL?.trim() || `http://localhost:${process.env.API_PORT ?? 5000}`,
  );
  const timeout = Number(process.env.SSLCZ_TIMEOUT_MS ?? 30_000);
  return {
    storeId,
    storePassword,
    isLive,
    gatewayBaseUrl: isLive ? SSLCZ_LIVE_URL : SSLCZ_SANDBOX_URL,
    callbackBaseUrl: `${apiBase}/api/v1/payments/sslcommerz`,
    webBaseUrl: getWebBaseUrl(),
    timeoutMs: Number.isFinite(timeout) && timeout >= 1000 ? timeout : 30_000,
  };
}

/** Startup checks (production): half-configured or plain-http live setups fail fast. */
export function validateSslcommerzEnv(isProduction: boolean): void {
  const id = process.env.SSLCZ_STORE_ID?.trim();
  const pass = process.env.SSLCZ_STORE_PASSWORD?.trim();
  if (Boolean(id) !== Boolean(pass)) {
    throw new Error('Set both SSLCZ_STORE_ID and SSLCZ_STORE_PASSWORD (or neither)');
  }
  const live = process.env.SSLCZ_IS_LIVE?.trim().toLowerCase();
  if (live !== undefined && live !== '' && live !== 'true' && live !== 'false') {
    throw new Error('SSLCZ_IS_LIVE must be "true" or "false"');
  }
  if (isProduction && id && live === 'true') {
    const api = process.env.API_PUBLIC_URL?.trim() ?? '';
    if (!api.startsWith('https://')) {
      throw new Error('API_PUBLIC_URL must be an https:// URL when SSLCZ_IS_LIVE=true');
    }
  }
}
