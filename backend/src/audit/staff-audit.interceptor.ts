import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { AuditSeverity, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { tap, type Observable } from 'rxjs';
import type { RequestUser } from '../auth/auth.types';
import { AuditService } from './audit.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Never copied into metadata (values are replaced by "[redacted]"). */
const SECRET_KEY_RE = /pass|token|secret|otp|code|csrf|signature|hash/i;
/** Access / money / security overrides. */
const CRITICAL_PATH_RE =
  /\/(role|status|force-logout|reset-password|password-reset|grant|extend|disable|enable|approve|mark-refunded|access-settings|logs\/purge)/;
/** Routes that already write a precise entry themselves. */
const SKIP_PATH_RE = /\/admin\/logs\/purge/;

/** Top-level body keys only, secrets redacted, long text trimmed — a summary, not a copy. */
function summarizeBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>).slice(0, 25)) {
    if (SECRET_KEY_RE.test(key)) out[key] = '[redacted]';
    else if (typeof value === 'string')
      out[key] = value.length > 120 ? `${value.slice(0, 117)}…` : value;
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null)
      out[key] = value;
    else if (Array.isArray(value)) out[key] = `[${value.length} items]`;
    else out[key] = '{…}';
  }
  return out;
}

/**
 * DEC-067 — one audit entry for every successful staff change (POST / PUT / PATCH / DELETE
 * under /api/v1/admin), tagged with the actor's role, IP and user agent. Covers uploads, edits,
 * CMS changes, overrides and deletions without touching each service. Reads are not logged.
 */
@Injectable()
export class StaffAuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
    if (
      !MUTATING.has(req.method) ||
      !path.startsWith('/api/v1/admin/') ||
      SKIP_PATH_RE.test(path)
    ) {
      return next.handle();
    }
    return next.handle().pipe(
      tap(() => {
        const user = req.user;
        if (!user || user.role === UserRole.USER) return;
        const routePath = (req.route as { path?: string } | undefined)?.path ?? path;
        const params = (req.params ?? {}) as Record<string, string>;
        const targetId = Object.values(params).find((v) => UUID_RE.test(v)) ?? null;
        void this.audit.record({
          actorUserId: user.userId,
          actorRole: user.role,
          action: `STAFF_${req.method}`,
          entityType: routePath.replace(/^\/api\/v1\//, '').slice(0, 80),
          entityId: targetId,
          severity:
            req.method === 'DELETE'
              ? AuditSeverity.WARNING
              : CRITICAL_PATH_RE.test(path)
                ? AuditSeverity.CRITICAL
                : AuditSeverity.INFO,
          ipAddress: req.ip ?? null,
          userAgent: req.get('user-agent') ?? null,
          metadata: JSON.parse(
            JSON.stringify({
              method: req.method,
              path,
              params,
              body: req.is('multipart/form-data') ? '[file upload]' : summarizeBody(req.body),
            }),
          ),
        });
      }),
    );
  }
}
