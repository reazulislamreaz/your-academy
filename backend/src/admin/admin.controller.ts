import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { AdminService } from './admin.service';
import { ExtendTrialDto } from './dto/extend-trial.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
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
    @Query('limit') limit?: string,
  ) {
    return createSuccessResponse(
      await this.admin.listUsers({
        q,
        status,
        limit: limit ? Number(limit) : undefined,
      }),
      newRequestId(),
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

  @Patch('users/:id/role')
  @UseGuards(CsrfGuard)
  async updateUserRole(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
  ) {
    return createSuccessResponse(
      await this.admin.updateUserRole(id, body.role, user.userId),
      newRequestId(),
    );
  }

  @Patch('users/:id/trial')
  @UseGuards(CsrfGuard)
  async extendTrial(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: ExtendTrialDto,
  ) {
    return createSuccessResponse(
      await this.admin.extendTrial(id, body.extendDays, user.userId),
      newRequestId(),
    );
  }
}
