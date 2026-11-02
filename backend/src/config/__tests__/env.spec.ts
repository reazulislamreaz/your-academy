import { getJwtAccessSecret, getWebOrigins, validateEnv } from '../env';

describe('env helpers', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('returns fallback JWT secret outside production when unset', () => {
    delete process.env.NODE_ENV;
    delete process.env.JWT_ACCESS_SECRET;
    expect(getJwtAccessSecret()).toContain('dev-only');
  });

  it('rejects missing JWT secret in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_ACCESS_SECRET;
    expect(() => getJwtAccessSecret()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects hardcoded fallback secret in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'dev-only-change-me-access-secret-32chars';
    expect(() => getJwtAccessSecret()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('parses comma-separated web origins', () => {
    process.env.WEB_ORIGINS = 'http://localhost:3000, https://app.example.com';
    expect(getWebOrigins()).toEqual(['http://localhost:3000', 'https://app.example.com']);
  });

  it('validateEnv requires COOKIE_SECURE in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET = 'production-secret-at-least-32-characters-long';
    process.env.COOKIE_SECURE = 'false';
    expect(() => validateEnv()).toThrow(/COOKIE_SECURE/);
  });
});
