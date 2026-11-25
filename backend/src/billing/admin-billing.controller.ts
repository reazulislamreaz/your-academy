import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentOrderStatus } from '@prisma/client';
import {
  SUBSCRIPTION_STATES,
  createSuccessResponse,
  cursorPaginationMeta,
} from '@your-academy/shared';
import type { Request } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { parseLimit } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import {
  CreatePackageDto,
  ReorderPackagesDto,
  ExtendSubscriptionDto,
  ManualGrantDto,
  SubscriptionNoteDto,
  UpdateAccessSettingsDto,
  UpdatePackageDto,
} from './dto/billing.dto';
import { PackagesService } from './packages.service';
import { PaymentsService } from './payments.service';
import { SiteSettingsService } from './site-settings.service';
import { SubscriptionRemindersService } from './subscription-reminders.service';
import { SubscriptionsService } from './subscriptions.service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOrUndefined = (v?: string) => (v && UUID_RE.test(v) ? v : undefined);
const dateOrUndefined = (v?: string) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** DEC-060 — packages, paid-system settings and subscribers (`subscriptions` permission). */
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('subscriptions')
export class AdminSubscriptionsController {
  constructor(
    private readonly packages: PackagesService,
    private readonly settings: SiteSettingsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly reminders: SubscriptionRemindersService,
  ) {}

  /** DEC-062 — runs the 7- / 3-day reminder pass now (it also runs hourly on its own). */
  @Post('subscriptions/reminders/run')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async runReminders() {
    return createSuccessResponse(await this.reminders.runOnce(), newRequestId());
  }

  @Get('access-settings')
  async getSettings() {
    return createSuccessResponse(this.settings.toDto(await this.settings.get()), newRequestId());
  }

  @Patch('access-settings')
  @UseGuards(CsrfGuard)
  async updateSettings(@CurrentUser() user: RequestUser, @Body() dto: UpdateAccessSettingsDto) {
    const s = await this.settings.update(dto, user.userId);
    return createSuccessResponse(this.settings.toDto(s), newRequestId());
  }

  @Get('packages')
  async listPackages() {
    return createSuccessResponse(await this.packages.listAdmin(), newRequestId());
  }

  @Post('packages')
  @UseGuards(CsrfGuard)
  async createPackage(@CurrentUser() user: RequestUser, @Body() dto: CreatePackageDto) {
    return createSuccessResponse(await this.packages.create(dto, user.userId), newRequestId());
  }

  @Patch('packages/:id')
  @UseGuards(CsrfGuard)
  async updatePackage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return createSuccessResponse(await this.packages.update(id, dto, user.userId), newRequestId());
  }

  /** `{ ids }` = every live package in display order. */
  @Post('packages/reorder')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async reorderPackages(@CurrentUser() user: RequestUser, @Body() dto: ReorderPackagesDto) {
    return createSuccessResponse(await this.packages.reorder(dto.ids, user.userId), newRequestId());
  }

  /** Hard delete only when never used; otherwise 409 PACKAGE_IN_USE (deactivate instead). */
  @Delete('packages/:id')
  @UseGuards(CsrfGuard)
  async deletePackage(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.packages.remove(id, user.userId), newRequestId());
  }

  @Get('subscribers')
  async listSubscribers(
    @Query('q') q?: string,
    @Query('state') state?: string,
    @Query('packageId') packageId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const take = parseLimit(limit, 50);
    const data = await this.subscriptions.listSubscribers({
      q,
      state: SUBSCRIPTION_STATES.find((s) => s === state),
      packageId: uuidOrUndefined(packageId),
      cursor: uuidOrUndefined(cursor),
      limit: take,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  @Get('subscribers/:userId')
  async getSubscriber(@Param('userId', ParseUUIDPipe) userId: string) {
    return createSuccessResponse(await this.subscriptions.getUserDetail(userId), newRequestId());
  }

  @Post('subscribers/:userId/grant')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async grant(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ManualGrantDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.subscriptions.manualGrant(userId, dto, user.userId, req.ip ?? null),
      newRequestId(),
    );
  }

  @Post('subscribers/:userId/extend')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async extend(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ExtendSubscriptionDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.subscriptions.extendByDays(
        userId,
        dto.days,
        dto.note,
        user.userId,
        req.ip ?? null,
      ),
      newRequestId(),
    );
  }

  @Post('subscribers/:userId/disable')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async disable(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SubscriptionNoteDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.subscriptions.disable(userId, dto.note, user.userId, req.ip ?? null),
      newRequestId(),
    );
  }

  @Post('subscribers/:userId/enable')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async enable(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SubscriptionNoteDto,
    @Req() req: Request,
  ) {
    return createSuccessResponse(
      await this.subscriptions.enable(userId, dto.note, user.userId, req.ip ?? null),
      newRequestId(),
    );
  }
}

/** DEC-060 — SSLCommerz transactions (`payments` permission). */
@Controller('api/v1/admin/payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('payments')
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  async list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('packageId') packageId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const take = parseLimit(limit, 50);
    const data = await this.payments.adminList({
      status: Object.values(PaymentOrderStatus).find((s) => s === status),
      q,
      packageId: uuidOrUndefined(packageId),
      from: dateOrUndefined(from),
      to: dateOrUndefined(to),
      cursor: uuidOrUndefined(cursor),
      limit: take,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.payments.adminGet(id), newRequestId());
  }

  /** Gateway request/response log for one order (secrets already removed). */
  @Get(':id/logs')
  async logs(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.payments.adminLogs(id), newRequestId());
  }

  @Post(':id/recheck')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async recheck(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.payments.adminRecheck(id, user.userId), newRequestId());
  }

  @Post(':id/approve')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async approve(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(
      await this.payments.adminApproveRisk(id, user.userId),
      newRequestId(),
    );
  }

  @Post(':id/mark-refunded')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async markRefunded(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubscriptionNoteDto,
  ) {
    return createSuccessResponse(
      await this.payments.adminMarkRefunded(id, user.userId, dto.note),
      newRequestId(),
    );
  }
}
