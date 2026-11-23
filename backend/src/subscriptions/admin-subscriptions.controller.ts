import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import type { Request } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { newRequestId } from '../common/request-id';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { GrantSubscriptionDto, RevokeSubscriptionDto } from './dto/admin-subscription.dto';

/** DEC-052 — Admin-only subscription grant / revoke (`users` permission). */
@Controller('api/v1/admin/users/:id/subscription')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('users')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: AdminSubscriptionsService) {}

  @Get()
  async overview(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.subscriptions.getOverview(id), newRequestId());
  }

  @Post()
  @UseGuards(CsrfGuard)
  async grant(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GrantSubscriptionDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.subscriptions.grant(id, body, user.userId, req.ip),
      newRequestId(),
    );
  }

  @Post('revoke')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async revoke(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RevokeSubscriptionDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.subscriptions.revoke(id, body ?? {}, user.userId, req.ip),
      newRequestId(),
    );
  }

  @Delete()
  @UseGuards(CsrfGuard)
  async revokeViaDelete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.subscriptions.revoke(id, {}, user.userId, req.ip),
      newRequestId(),
    );
  }
}
