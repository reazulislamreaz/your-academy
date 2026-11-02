const DEV_JWT_FALLBACK = 'dev-only-change-me-access-secret-32chars';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** JWT access secret — never use the hardcoded fallback in production. */
export function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET?.trim();
  if (secret && secret.length >= 32 && secret !== DEV_JWT_FALLBACK) {
    return secret;
  }
  if (isProduction()) {
    throw new Error(
      'JWT_ACCESS_SECRET must be set to a strong secret (≥32 chars) when NODE_ENV=production',
    );
  }
  if (secret && secret.length >= 32) {
    return secret;
  }
  return DEV_JWT_FALLBACK;
}

/** Comma-separated WEB_ORIGIN / WEB_ORIGINS allowlist for credentialed CORS. */
export function getWebOrigins(): string[] {
  const raw = process.env.WEB_ORIGINS ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Validate required process env before Nest boots.
 * Production refuses weak/missing secrets and insecure cookie settings.
 */
export function validateEnv(): void {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET'] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (isProduction()) {
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    getJwtAccessSecret();
    if (process.env.COOKIE_SECURE !== 'true') {
      throw new Error('COOKIE_SECURE must be "true" when NODE_ENV=production');
    }
    const trialDays = Number(process.env.TRIAL_DAYS ?? 7);
    if (trialDays !== 7) {
      throw new Error('TRIAL_DAYS must remain 7 unless business approves a change');
    }
  } else if (process.env.JWT_ACCESS_SECRET) {
    // Warm the resolver so misconfigured short secrets surface early in logs.
    getJwtAccessSecret();
  }
}
