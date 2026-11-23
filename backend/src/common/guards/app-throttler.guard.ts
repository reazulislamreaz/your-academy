import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { getJwtAccessSecret } from '../../config/env';

/** Paths that serve question/exam content — the bulk-scraping budget applies here. */
const CONTENT_PATH =
  /^\/api\/v1\/(public\/(questions|question-sets|written-question-sets|topic-|exams|model-tests)|questions|practice-sets|practice-attempts)/;

export function isContentPath(path: string): boolean {
  return CONTENT_PATH.test(path);
}

/** Client IP: a trusted edge header (e.g. Cloudflare's) when configured, else Express's req.ip. */
export function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase();
  const fromHeader = header ? req.headers[header] : undefined;
  if (typeof fromHeader === 'string' && fromHeader.length > 0 && fromHeader.length <= 64) {
    return fromHeader.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

/**
 * Rate limits per signed-in user (verified access JWT) and per IP for guests, instead of
 * per socket address — behind nginx every request would otherwise share one bucket.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  private readonly log = new Logger('RateLimit');
  private static readonly jwt = new JwtService({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- signature fixed by ThrottlerGuard
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const cookieName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    const auth = req.headers?.authorization;
    const token =
      req.cookies?.[cookieName] ??
      (typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : undefined);
    if (typeof token === 'string') {
      try {
        const payload = AppThrottlerGuard.jwt.verify<{ sub?: string }>(token, {
          secret: getJwtAccessSecret(),
        });
        if (payload.sub) return `u:${payload.sub}`;
      } catch {
        // Expired/invalid token: fall back to IP; the auth guard will reject it anyway.
      }
    }
    return `ip:${clientIp(req as { headers: Record<string, unknown>; ip?: string })}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<{ method: string; originalUrl?: string; url: string }>();
    // Unusual bulk access is worth a log line; never log tokens or bodies.
    this.log.warn(
      `${detail.tracker} hit limit ${detail.limit}/${Math.round(detail.ttl / 1000)}s on ${req.method} ${(req.originalUrl ?? req.url).split('?')[0]}`,
    );
    return super.throwThrottlingException(context, detail);
  }
}
