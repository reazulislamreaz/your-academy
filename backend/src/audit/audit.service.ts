import { Injectable, Logger } from '@nestjs/common';
import { AuditSeverity, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type AuditInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  /** UUID of the target row; any other value (e.g. "FREE") is kept in metadata.targetRef. */
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  /** DEC-067 — looked up from the actor when omitted. */
  actorRole?: string | null;
  /** DEC-067 — derived from the action name when omitted (see severityForAction). */
  severity?: AuditSeverity;
  userAgent?: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Actions that remove or revoke something. */
const WARNING_RE =
  /(DELETE|REMOVE|ARCHIVE|REVOKE|DEACTIVATE|UNPUBLISH|FORCE_LOGOUT|FAILED|DISABLE|CANCEL)/;
/** Access, money and security changes. */
const CRITICAL_RE =
  /(ROLE_CHANGE|STATUS_CHANGE|PASSWORD_RESET(?!_COMPLETED|_REQUESTED)|SUBSCRIPTION_(GRANT|EXTEND|DISABLE|ENABLE)|PAYMENT_(APPROVE|MARK_REFUNDED)|ACCESS_SETTINGS|LOGS_PURGED|TOKEN_REUSE|STAFF_CREATE)/;

/** DEC-067 — default severity when a caller does not pass one. */
export function severityForAction(action: string): AuditSeverity {
  if (CRITICAL_RE.test(action)) return AuditSeverity.CRITICAL;
  if (WARNING_RE.test(action)) return AuditSeverity.WARNING;
  return AuditSeverity.INFO;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput) {
    try {
      // `entity_id` is a UUID column: a non-UUID target used to make the insert fail silently.
      const rawEntityId = input.entityId ?? null;
      const entityId = rawEntityId && UUID_RE.test(rawEntityId) ? rawEntityId : null;
      const metadata =
        rawEntityId && !entityId
          ? ({
              ...(typeof input.metadata === 'object' &&
              input.metadata !== null &&
              !Array.isArray(input.metadata)
                ? (input.metadata as Prisma.InputJsonObject)
                : input.metadata === undefined
                  ? {}
                  : { value: input.metadata }),
              targetRef: rawEntityId,
            } as Prisma.InputJsonValue)
          : (input.metadata ?? {});

      let actorRole = input.actorRole ?? null;
      if (!actorRole && input.actorUserId) {
        const actor = await this.prisma.user.findUnique({
          where: { id: input.actorUserId },
          select: { role: true },
        });
        actorRole = actor?.role ?? null;
      }

      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId,
          metadata,
          ipAddress: input.ipAddress?.slice(0, 64) ?? null,
          actorRole,
          severity: input.severity ?? severityForAction(input.action),
          userAgent: input.userAgent?.slice(0, 400) ?? null,
        },
      });
    } catch (err) {
      // Auditing must never break the primary mutation path.
      this.logger.warn(`Failed to write audit log: ${String(err)}`);
    }
  }
}
