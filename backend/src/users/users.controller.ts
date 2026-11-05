import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { AccessControlService } from '../subscriptions/access-control.service';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateStudyPrefsDto } from './dto/update-study-prefs.dto';
import { UsersService } from './users.service';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
  ) {}

  @Get('users/me')
  async me(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.users.getMe(user), newRequestId());
  }

  @Patch('users/me')
  @UseGuards(CsrfGuard)
  async updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return createSuccessResponse(await this.users.updateMe(user, dto), newRequestId());
  }

  @Patch('users/me/study-prefs')
  @UseGuards(CsrfGuard)
  async updateStudyPrefs(@CurrentUser() user: RequestUser, @Body() dto: UpdateStudyPrefsDto) {
    return createSuccessResponse(await this.users.updateStudyPrefs(user, dto), newRequestId());
  }

  @Post('users/me/avatar')
  @UseGuards(CsrfGuard)
  async setAvatar(
    @CurrentUser() user: RequestUser,
    @Body() body: { mediaAssetId: string },
  ) {
    return createSuccessResponse(
      await this.users.setAvatar(user, body.mediaAssetId),
      newRequestId(),
    );
  }

  @Get('users/me/stats')
  async stats(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.users.getStats(user), newRequestId());
  }

  @Get('me/access')
  async accessSnapshot(@CurrentUser() user: RequestUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    return createSuccessResponse(await this.access.getAccessSnapshot(dbUser), newRequestId());
  }
}
