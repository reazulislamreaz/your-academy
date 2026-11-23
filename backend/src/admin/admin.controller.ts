import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole, UserStatus } from '@prisma/client';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { Request, Response } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { parseLimit } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import { AdminPasswordResetService } from './admin-password-reset.service';
import { AdminUserSessionsService } from './admin-user-sessions.service';
import { AdminService } from './admin.service';
import { AdminResetByEmailDto, AdminTemporaryPasswordDto } from './dto/admin-password-reset.dto';
import {
  AdminResetPasswordDto,
  CreateStaffUserDto,
  UpdateStaffUserDto,
  UpdateUserRoleDto,
} from './dto/staff-user.dto';
import { StaffUsersService } from './staff-users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('users')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly staff: StaffUsersService,
    private readonly passwordResets: AdminPasswordResetService,
    private readonly sessions: AdminUserSessionsService,
  ) {}

  @RequirePermission('dashboard')
  @Get('dashboard')
  async dashboard() {
    return createSuccessResponse(await this.admin.dashboard(), newRequestId());
  }

  @Get('users')
  async listUsers(
    @Query('q') q?: string,
    @Query('status') status?: UserStatus,
    @Query('role') role?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    const take = parseLimit(limit, 50);
    const data = await this.admin.listUsers({
      q,
      status,
      // Allowlist — never pass a raw client value into the Prisma filter.
      role: Object.values(UserRole).find((r) => r === role),
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

  @Post('users')
  @UseGuards(CsrfGuard)
  async createStaffUser(@CurrentUser() user: RequestUser, @Body() body: CreateStaffUserDto) {
    return createSuccessResponse(await this.staff.create(body, user.userId), newRequestId());
  }

  @Patch('users/:id')
  @UseGuards(CsrfGuard)
  async updateStaffUser(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateStaffUserDto,
  ) {
    return createSuccessResponse(await this.staff.update(id, body, user.userId), newRequestId());
  }

  @Patch('users/:id/role')
  @UseGuards(CsrfGuard)
  async updateUserRole(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    return createSuccessResponse(
      await this.staff.changeRole(id, body.role, user.userId),
      newRequestId(),
    );
  }

  @Patch('users/:id/status')
  @UseGuards(CsrfGuard)
  async updateUserStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return createSuccessResponse(
      await this.staff.updateStatus(id, body.status, user.userId),
      newRequestId(),
    );
  }

  @Post('users/:id/reset-password')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async resetStaffPassword(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: AdminResetPasswordDto,
  ) {
    return createSuccessResponse(
      await this.staff.resetModeratorPassword(id, body, user.userId),
      newRequestId(),
    );
  }

  // ─── Admin-assisted password reset (Admin-only via the class-level `users` permission) ───

  @Post('users/:id/password-reset/email')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async passwordResetByEmail(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminResetByEmailDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.passwordResets.sendByEmail(id, body.email, user.userId, req.ip),
      newRequestId(),
    );
  }

  @Post('users/:id/password-reset/link')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async passwordResetLink(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.passwordResets.createShareableLink(id, user.userId, req.ip),
      newRequestId(),
    );
  }

  @Post('users/:id/password-reset/temporary')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async passwordResetTemporary(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AdminTemporaryPasswordDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.passwordResets.setTemporaryPassword(id, body.password, user.userId, req.ip),
      newRequestId(),
    );
  }

  @Get('users/:id/password-reset/history')
  async passwordResetHistory(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.passwordResets.history(id), newRequestId());
  }

  // ─── Sign-ins (single-device rule) ───

  @Get('users/:id/logins')
  async recentLogins(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.sessions.recentLogins(id), newRequestId());
  }

  @Post('users/:id/force-logout')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async forceLogout(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.sessions.forceLogout(id, user.userId, req.ip),
      newRequestId(),
    );
  }

  @RequirePermission('activity')
  @Get('activity/overview')
  async activityOverview() {
    return createSuccessResponse(await this.admin.activityOverview(), newRequestId());
  }

  @RequirePermission('activity')
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

  @RequirePermission('activity')
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

  @RequirePermission('activity')
  @Get('activity/trends')
  async activityTrends(@Query('from') from?: string, @Query('to') to?: string) {
    return createSuccessResponse(await this.admin.activityTrends({ from, to }), newRequestId());
  }

  @RequirePermission('activity')
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

  @RequirePermission('audit')
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
