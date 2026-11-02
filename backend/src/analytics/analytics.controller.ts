import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import type { Request } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { AnalyticsService } from './analytics.service';
import { HeartbeatDto, StartSessionDto } from './dto/analytics.dto';

@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('sessions')
  @UseGuards(CsrfGuard)
  async start(
    @CurrentUser() user: RequestUser,
    @Body() body: StartSessionDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.analytics.start(user, body.clientInstanceId, req.headers['user-agent']),
      newRequestId(),
    );
  }

  @Post('sessions/:id/heartbeat')
  @UseGuards(CsrfGuard)
  async heartbeat(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: HeartbeatDto,
  ) {
    return createSuccessResponse(await this.analytics.heartbeat(user, id, body), newRequestId());
  }

  @Post('sessions/:id/end')
  @UseGuards(CsrfGuard)
  async end(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.analytics.end(user, id), newRequestId());
  }

  @Get('me/summary')
  async summary(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.analytics.mySummary(user), newRequestId());
  }
}
