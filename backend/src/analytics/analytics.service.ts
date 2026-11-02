import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BrowsingSessionStatus, Prisma } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

const HEARTBEAT_SECONDS = 30;
const MAX_SKEW_SECONDS = 5;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * DEC-010 current assumption: at most one ACTIVE session per user.
   * Same clientInstanceId reattaches; other tabs reuse the ACTIVE session without multiplying time.
   */
  async start(user: RequestUser, clientInstanceId?: string, userAgent?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const active = await tx.browsingSession.findFirst({
          where: { userId: user.userId, status: BrowsingSessionStatus.ACTIVE },
        });

        if (active) {
          if (
            clientInstanceId &&
            active.clientInstanceId &&
            active.clientInstanceId !== clientInstanceId
          ) {
            // Another tab owns the billable session — attach by returning it (no-op create).
            return active;
          }
          return tx.browsingSession.update({
            where: { id: active.id },
            data: {
              ...(clientInstanceId ? { clientInstanceId } : {}),
              ...(userAgent ? { userAgent } : {}),
              lastHeartbeatAt: new Date(),
            },
          });
        }

        return tx.browsingSession.create({
          data: {
            userId: user.userId,
            clientInstanceId,
            userAgent,
            status: BrowsingSessionStatus.ACTIVE,
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const active = await this.prisma.browsingSession.findFirst({
          where: { userId: user.userId, status: BrowsingSessionStatus.ACTIVE },
        });
        if (active) return active;
      }
      throw err;
    }
  }

  async heartbeat(
    user: RequestUser,
    sessionId: string,
    body: { visibilityState?: string; clientInstanceId?: string },
  ) {
    const session = await this.prisma.browsingSession.findFirst({
      where: { id: sessionId, userId: user.userId, status: BrowsingSessionStatus.ACTIVE },
    });
    if (!session) {
      throw new NotFoundException(
        createErrorResponse('SESSION_NOT_FOUND', 'Browsing session not found', newRequestId()),
      );
    }

    // Non-owner tabs must not steal ownership or double-accrue.
    if (
      session.clientInstanceId &&
      body.clientInstanceId &&
      session.clientInstanceId !== body.clientInstanceId
    ) {
      return { accruedSeconds: session.accruedSeconds, paused: true, ignored: true };
    }

    if (body.visibilityState === 'hidden') {
      return { accruedSeconds: session.accruedSeconds, paused: true };
    }

    const now = new Date();
    const elapsed = Math.floor((now.getTime() - session.lastHeartbeatAt.getTime()) / 1000);
    if (elapsed < 0) {
      throw new BadRequestException(
        createErrorResponse('INVALID_HEARTBEAT', 'Invalid heartbeat timing', newRequestId()),
      );
    }

    const increment = Math.min(elapsed, HEARTBEAT_SECONDS + MAX_SKEW_SECONDS);
    const accruedSeconds = session.accruedSeconds + Math.max(0, increment);

    return this.prisma.browsingSession.update({
      where: { id: session.id },
      data: {
        lastHeartbeatAt: now,
        accruedSeconds,
        // Claim ownership only when unset (first successful visible beat).
        ...(body.clientInstanceId && !session.clientInstanceId
          ? { clientInstanceId: body.clientInstanceId }
          : {}),
      },
    });
  }

  async end(user: RequestUser, sessionId: string) {
    const session = await this.prisma.browsingSession.findFirst({
      where: { id: sessionId, userId: user.userId },
    });
    if (!session) {
      throw new NotFoundException(
        createErrorResponse('SESSION_NOT_FOUND', 'Browsing session not found', newRequestId()),
      );
    }
    return this.prisma.browsingSession.update({
      where: { id: sessionId },
      data: { status: BrowsingSessionStatus.ENDED, endedAt: new Date() },
    });
  }

  async endActiveForUser(userId: string) {
    await this.prisma.browsingSession.updateMany({
      where: { userId, status: BrowsingSessionStatus.ACTIVE },
      data: { status: BrowsingSessionStatus.ENDED, endedAt: new Date() },
    });
  }

  async mySummary(user: RequestUser) {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

    const [all, day, week] = await Promise.all([
      this.prisma.browsingSession.aggregate({
        where: { userId: user.userId },
        _sum: { accruedSeconds: true },
        _count: true,
      }),
      this.prisma.browsingSession.aggregate({
        where: { userId: user.userId, startedAt: { gte: startOfDay } },
        _sum: { accruedSeconds: true },
      }),
      this.prisma.browsingSession.aggregate({
        where: { userId: user.userId, startedAt: { gte: startOfWeek } },
        _sum: { accruedSeconds: true },
      }),
    ]);

    return {
      totalSeconds: all._sum.accruedSeconds ?? 0,
      sessions: all._count,
      daySeconds: day._sum.accruedSeconds ?? 0,
      weekSeconds: week._sum.accruedSeconds ?? 0,
    };
  }
}
