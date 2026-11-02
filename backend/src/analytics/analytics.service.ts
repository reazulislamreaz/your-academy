import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BrowsingSessionStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

const HEARTBEAT_SECONDS = 30;
const MAX_SKEW_SECONDS = 5;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(user: RequestUser, clientInstanceId?: string, userAgent?: string) {
    await this.prisma.browsingSession.updateMany({
      where: { userId: user.userId, status: BrowsingSessionStatus.ACTIVE },
      data: { status: BrowsingSessionStatus.ENDED, endedAt: new Date() },
    });

    return this.prisma.browsingSession.create({
      data: {
        userId: user.userId,
        clientInstanceId,
        userAgent,
        status: BrowsingSessionStatus.ACTIVE,
      },
    });
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
        ...(body.clientInstanceId ? { clientInstanceId: body.clientInstanceId } : {}),
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

  async mySummary(user: RequestUser) {
    const agg = await this.prisma.browsingSession.aggregate({
      where: { userId: user.userId },
      _sum: { accruedSeconds: true },
      _count: true,
    });
    return {
      totalSeconds: agg._sum.accruedSeconds ?? 0,
      sessions: agg._count,
    };
  }
}
