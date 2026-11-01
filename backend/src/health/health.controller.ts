import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  createErrorResponse,
  createSuccessResponse,
  type ApiSuccess,
  type HealthData,
} from '@your-academy/shared';
import { PrismaService } from '../database/prisma.service';
import { newRequestId } from '../common/request-id';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
    ApiSuccess<HealthData & { checks: { api: string; database: string } }>
  > {
    const requestId = newRequestId();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException(
        createErrorResponse('NOT_READY', 'Database unavailable', requestId),
      );
    }

    return createSuccessResponse(
      {
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
        checks: { api: 'up', database: 'up' },
      },
      requestId,
    );
  }
}
