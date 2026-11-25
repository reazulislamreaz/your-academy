import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { getJwtAccessSecret } from '../../config/env';

export { clientIp, isContentPath, isInternalServerRequest } from './client-ip';
import { clientIp, isInternalServerRequest } from './client-ip';

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

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return false;
    return isInternalServerRequest(
      context.switchToHttp().getRequest<{
        headers: Record<string, unknown>;
        socket?: { remoteAddress?: string };
      }>(),
    );
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
