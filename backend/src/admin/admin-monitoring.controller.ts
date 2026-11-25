import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createSuccessResponse } from '@your-academy/shared';
import type { Request } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { newRequestId } from '../common/request-id';
import { AdminMonitoringService } from './admin-monitoring.service';
import { PurgeLogsDto, PurgePreviewDto } from './dto/log-purge.dto';

/** DEC-067 — Activity KPIs + user lookup (`activity`), log retention (`audit`). Admin-only permissions. */
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminMonitoringController {
  constructor(private readonly monitoring: AdminMonitoringService) {}

  @RequirePermission('activity')
  @Get('activity/kpis')
  async kpis() {
    return createSuccessResponse(await this.monitoring.kpis(), newRequestId());
  }

  /** Name / email / WhatsApp ↔ User ID (full UUID or prefix). Invalid input → empty, never 500. */
  @RequirePermission('activity')
  @Get('activity/users/lookup')
  async lookup(@Query('q') q?: string) {
    return createSuccessResponse(await this.monitoring.lookupUsers(q), newRequestId());
  }

  @RequirePermission('audit')
  @Post('logs/purge/preview')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async preview(@Body() dto: PurgePreviewDto) {
    return createSuccessResponse(await this.monitoring.previewPurge(dto), newRequestId());
  }

  @RequirePermission('audit')
  @Post('logs/purge')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async purge(@CurrentUser() user: RequestUser, @Body() dto: PurgeLogsDto, @Req() req: Request) {
    return createSuccessResponse(
      await this.monitoring.purge(dto, user, {
        ipAddress: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      }),
      newRequestId(),
    );
  }
}
