import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type AuditInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          metadata: input.metadata ?? {},
          ipAddress: input.ipAddress ?? null,
        },
      });
    } catch (err) {
      // Auditing must never break the primary mutation path.
      this.logger.warn(`Failed to write audit log: ${String(err)}`);
    }
  }
}
