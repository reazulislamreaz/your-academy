jest.mock('@nestjs/passport', () => ({
  PassportStrategy: () =>
    class {
      constructor(_options?: unknown) {}
    },
}));

import { UserRole, UserStatus } from '@prisma/client';
import { JwtStrategy } from '../jwt.strategy';

function errCode(err: unknown): string | undefined {
  const res = (err as { getResponse?: () => unknown }).getResponse?.() as
    | { error?: { code?: string } }
    | undefined;
  return res?.error?.code;
}

describe('JwtStrategy session checks', () => {
  const prisma = { user: { findUnique: jest.fn() }, authSession: { findUnique: jest.fn() } };
  const strategy = new JwtStrategy(prisma as never);
  const payload = { sub: 'u1', role: UserRole.USER, sid: 's1' };
  const user = { id: 'u1', role: UserRole.USER, status: UserStatus.ACTIVE, deletedAt: null, mustChangePassword: false };
  const live = { id: 's1', userId: 'u1', revokedAt: null, revokedReason: null, expiresAt: new Date(Date.now() + 60_000) };
  const req = (method: string, url: string) => ({ method, originalUrl: url }) as never;

  beforeEach(() => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.authSession.findUnique.mockResolvedValue(live);
  });

  it('rejects an old device immediately with SESSION_REPLACED', async () => {
    prisma.authSession.findUnique.mockResolvedValue({ ...live, revokedAt: new Date(), revokedReason: 'REPLACED' });
    const err = await strategy.validate(req('GET', '/api/v1/questions'), payload).catch((e: unknown) => e);
    expect(errCode(err)).toBe('SESSION_REPLACED');
  });

  it('keeps a plain revoked session as a generic 401', async () => {
    prisma.authSession.findUnique.mockResolvedValue({ ...live, revokedAt: new Date(), revokedReason: 'LOGOUT' });
    const err = await strategy.validate(req('GET', '/api/v1/questions'), payload).catch((e: unknown) => e);
    expect(errCode(err)).toBe('UNAUTHORIZED');
  });

  it('blocks everything but change-password while a temporary password is active', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, mustChangePassword: true });
    const err = await strategy.validate(req('GET', '/api/v1/questions?x=1'), payload).catch((e: unknown) => e);
    expect(errCode(err)).toBe('PASSWORD_CHANGE_REQUIRED');
    await expect(strategy.validate(req('POST', '/api/v1/auth/change-password'), payload)).resolves.toMatchObject({ userId: 'u1' });
    await expect(strategy.validate(req('GET', '/api/v1/users/me'), payload)).resolves.toMatchObject({ userId: 'u1' });
  });
});
