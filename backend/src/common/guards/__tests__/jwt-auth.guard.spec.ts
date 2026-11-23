jest.mock('@nestjs/passport', () => ({
  AuthGuard: () => class MockAuthGuard {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { JwtAuthGuard } from '../jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard();

  it('returns the authenticated user', () => {
    const user = { userId: 'u1', role: 'ADMIN', sessionId: 's1' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('preserves a strategy UnauthorizedException such as session expiry', () => {
    const expired = new UnauthorizedException(
      createErrorResponse('UNAUTHORIZED', 'Session expired', 'req-1'),
    );
    expect(() => guard.handleRequest(expired, null)).toThrow(expired);
  });

  it('maps a missing or malformed token to Authentication required', () => {
    try {
      guard.handleRequest(null, null);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const body = (err as UnauthorizedException).getResponse() as {
        error?: { code?: string; message?: string };
      };
      expect(body.error?.code).toBe('UNAUTHORIZED');
      expect(body.error?.message).toBe('Authentication required');
    }
  });
});
