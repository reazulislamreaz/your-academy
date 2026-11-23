import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

/**
 * Admin view of a user's sign-ins (one row per login, i.e. per refresh-token family)
 * and a force-logout that revokes every active session.
 */
@Injectable()
export class AdminUserSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async recentLogins(userId: string, limit = 15) {
    const rows = await this.prisma.authSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: {
        familyId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        revokedAt: true,
        revokedReason: true,
        expiresAt: true,
      },
    });

    // Rows arrive newest-first; each family's last row is its original login.
    const families = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = families.get(row.familyId) ?? [];
      list.push(row);
      families.set(row.familyId, list);
    }
    const now = new Date();
    return [...families.values()]
      .map((list) => {
        const latest = list[0];
        const first = list[list.length - 1];
        const active = list.some((r) => !r.revokedAt && r.expiresAt > now);
        const ended = active ? null : latest;
        return {
          loggedInAt: first.createdAt.toISOString(),
          lastSeenAt: latest.createdAt.toISOString(),
          userAgent: latest.userAgent ?? first.userAgent,
          ipAddress: latest.ipAddress ?? first.ipAddress,
          active,
          endedReason: ended && ended.revokedReason !== 'ROTATED' ? ended.revokedReason : active ? null : 'EXPIRED',
        };
      })
      .sort((a, b) => b.loggedInAt.localeCompare(a.loggedInAt))
      .slice(0, Math.min(Math.max(limit, 1), 50));
  }

  async forceLogout(userId: string, actorUserId: string, ip?: string) {
    if (userId === actorUserId) {
      throw new ForbiddenException(
        createErrorResponse('USE_ACCOUNT_SETTINGS', 'Use Sign out for your own account', newRequestId()),
      );
    }
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
    if (!user) {
      throw new NotFoundException(createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()));
    }
    const result = await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'ADMIN_LOGOUT' },
    });
    await this.audit.record({
      actorUserId,
      action: 'USER_FORCE_LOGOUT',
      entityType: 'user',
      entityId: userId,
      ipAddress: ip ?? null,
      metadata: { sessionsRevoked: result.count },
    });
    return { sessionsRevoked: result.count };
  }
}
