import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import {
  createErrorResponse,
  createSuccessResponse,
  type ApiSuccess,
  type HealthData,
} from '@your-academy/shared';
import type IORedis from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { newRequestId } from '../common/request-id';
import { REDIS_CONNECTION } from '../queue/queue.constants';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
  ) {}

  @Get('health')
  getHealth(): ApiSuccess<HealthData> {
    return createSuccessResponse(
      {
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
      },
      newRequestId(),
    );
  }

  @Get('api/v1/health')
  getVersionedHealth(): ApiSuccess<HealthData> {
    return this.getHealth();
  }

  @Get('ready')
  async getReady(): Promise<
    ApiSuccess<
      HealthData & { checks: { api: string; database: string; redis: string } }
    >
  > {
    const requestId = newRequestId();
    const checks = { api: 'up', database: 'down', redis: 'down' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {
      throw new ServiceUnavailableException(
        createErrorResponse('NOT_READY', 'Database unavailable', requestId),
      );
    }

    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error(`Unexpected Redis PING response: ${pong}`);
      }
      checks.redis = 'up';
    } catch {
      throw new ServiceUnavailableException(
        createErrorResponse('NOT_READY', 'Redis unavailable', requestId),
      );
    }

    return createSuccessResponse(
      {
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
        checks,
      },
      requestId,
    );
  }
}
