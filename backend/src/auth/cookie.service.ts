import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

@Injectable()
export class CookieService {
  private get secure() {
    return process.env.COOKIE_SECURE === 'true';
  }

  private get sameSite(): 'lax' | 'strict' | 'none' {
    const value = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
    if (value === 'strict' || value === 'none') return value;
    return 'lax';
  }

  private get domain(): string | undefined {
    return process.env.COOKIE_DOMAIN || undefined;
  }

  setAuthCookies(
    res: Response,
    params: { accessToken: string; refreshToken: string; csrfToken: string },
  ) {
    const accessName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    const refreshName = process.env.REFRESH_COOKIE_NAME ?? 'refresh_token';
    const csrfName = process.env.CSRF_COOKIE_NAME ?? 'csrf_token';
    const accessTtl = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000);

    const base = {
      secure: this.secure,
      sameSite: this.sameSite,
      domain: this.domain,
      path: '/',
    } as const;

    res.cookie(accessName, params.accessToken, {
      ...base,
      httpOnly: true,
      maxAge: accessTtl * 1000,
    });
    res.cookie(refreshName, params.refreshToken, {
      ...base,
      httpOnly: true,
      maxAge: refreshTtl * 1000,
    });
    res.cookie(csrfName, params.csrfToken, {
      ...base,
      httpOnly: false,
      maxAge: refreshTtl * 1000,
    });
  }

  clearAuthCookies(res: Response) {
    const names = [
      process.env.ACCESS_COOKIE_NAME ?? 'access_token',
      process.env.REFRESH_COOKIE_NAME ?? 'refresh_token',
      process.env.CSRF_COOKIE_NAME ?? 'csrf_token',
    ];
    for (const name of names) {
      res.clearCookie(name, {
        path: '/',
        domain: this.domain,
        secure: this.secure,
        sameSite: this.sameSite,
      });
    }
  }
}
