import { Controller, Get } from '@nestjs/common';
import type { ApiSuccess, HealthData } from '@your-academy/shared';
import { randomUUID } from 'node:crypto';

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): ApiSuccess<HealthData> {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
      },
      meta: { requestId: randomUUID() },
    };
  }

  @Get('api/v1/health')
  getVersionedHealth(): ApiSuccess<HealthData> {
    return this.getHealth();
  }

  @Get('ready')
  getReady(): ApiSuccess<HealthData & { checks: { api: string } }> {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
        checks: { api: 'up' },
      },
      meta: { requestId: randomUUID() },
    };
  }
}
