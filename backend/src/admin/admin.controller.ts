import { Body, Controller, Get, Param, Patch, Query, Res, UseGuards } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { Response } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { parseLimit } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  async dashboard() {
    return createSuccessResponse(await this.admin.dashboard(), newRequestId());
  }

  @Get('users')
  async listUsers(
    @Query('q') q?: string,
    @Query('status') status?: UserStatus,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    const take = parseLimit(limit, 50);
    const data = await this.admin.listUsers({
      q,
      status,
      cursor,
      limit: take,
      createdFrom,
      createdTo,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return createSuccessResponse(await this.admin.getUser(id), newRequestId());
  }

  @Patch('users/:id/status')
  @UseGuards(CsrfGuard)
  async updateUserStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return createSuccessResponse(
      await this.admin.updateUserStatus(id, body.status, user.userId),
      newRequestId(),
    );
  }

  @Get('activity/overview')
  async activityOverview() {
    return createSuccessResponse(await this.admin.activityOverview(), newRequestId());
  }

  @Get('activity/online')
  async activityOnline(@Query('q') q?: string, @Query('limit') limit?: string) {
    return createSuccessResponse(
      await this.admin.activityOnline({
        q,
        limit: limit ? Number(limit) : undefined,
      }),
      newRequestId(),
    );
  }

  @Get('activity/events')
  async activityEvents(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('subjectId') subjectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const take = parseLimit(limit, 50);
    const data = await this.admin.activityEvents({
      userId,
      type,
      subjectId,
      from,
      to,
      cursor,
      limit: take,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('activity/trends')
  async activityTrends(@Query('from') from?: string, @Query('to') to?: string) {
    return createSuccessResponse(await this.admin.activityTrends({ from, to }), newRequestId());
  }

  @Get('activity/export')
  async activityExport(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('subjectId') subjectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const { filename, csv } = await this.admin.activityExport({
      userId,
      type,
      subjectId,
      from,
      to,
    });
    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res!.send(csv);
  }

  @Get('audit')
  async listAudit(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    const take = parseLimit(limit, 50);
    const data = await this.admin.listAudit({
      cursor,
      limit: take,
      action,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }
}
