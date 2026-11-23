import type { Request } from 'express';
import { cookieOrBearerExtractor } from '../access-token';

function req(partial: {
  authorization?: string;
  cookies?: Record<string, string>;
}): Request {
  return {
    headers: partial.authorization ? { authorization: partial.authorization } : {},
    cookies: partial.cookies ?? {},
  } as Request;
}

describe('cookieOrBearerExtractor', () => {
  const previous = process.env.ACCESS_COOKIE_NAME;

  afterEach(() => {
    if (previous === undefined) delete process.env.ACCESS_COOKIE_NAME;
    else process.env.ACCESS_COOKIE_NAME = previous;
  });

  it('reads a Bearer access token', () => {
    expect(cookieOrBearerExtractor(req({ authorization: 'Bearer access-jwt' }))).toBe(
      'access-jwt',
    );
  });

  it('falls back to the HTTP-only access cookie used by browser uploads', () => {
    process.env.ACCESS_COOKIE_NAME = 'access_token';
    expect(
      cookieOrBearerExtractor(req({ cookies: { access_token: 'cookie-jwt' } })),
    ).toBe('cookie-jwt');
  });

  it('prefers Bearer when both are present', () => {
    expect(
      cookieOrBearerExtractor(
        req({
          authorization: 'Bearer header-jwt',
          cookies: { access_token: 'cookie-jwt' },
        }),
      ),
    ).toBe('header-jwt');
  });

  it('returns null when neither credential is present', () => {
    expect(cookieOrBearerExtractor(req({}))).toBeNull();
  });
});
