import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createSuccessResponse, type PublicAccessConfig } from '@your-academy/shared';
import type { Response } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { CheckoutDto, ScheduleChangeDto } from './dto/billing.dto';
import { PackagesService } from './packages.service';
import { PaymentsService, type CallbackKind } from './payments.service';
import { SiteSettingsService } from './site-settings.service';
import { SubscriptionsService } from './subscriptions.service';

type GatewayBody = Record<string, unknown>;

/** DEC-060 — learner-facing packages, checkout, own subscription, SSLCommerz callbacks. */
@Controller('api/v1')
export class BillingController {
  constructor(
    private readonly packages: PackagesService,
    private readonly payments: PaymentsService,
    private readonly settings: SiteSettingsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /** Flags the web app needs to show / hide locks and Buy buttons. */
  @Get('public/access-config')
  @Header('Cache-Control', 'no-cache')
  async accessConfig() {
    const s = await this.settings.get();
    const data: PublicAccessConfig = {
      paidSystemEnabled: s.paidSystemEnabled,
      paymentsConfigured: this.payments.isConfigured(),
    };
    return createSuccessResponse(data, newRequestId());
  }

  @Get('public/packages')
  @Header('Cache-Control', 'no-cache')
  async listPackages() {
    return createSuccessResponse(await this.packages.listActive(), newRequestId());
  }

  @Get('me/subscription')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  async mySubscription(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(
      await this.subscriptions.getMine(user.userId, user.role),
      newRequestId(),
    );
  }

  // ─── DEC-062 — self-service plan management (no automatic charges exist) ─────

  /** Stop renewing: access stays until the end date, reminders say so. */
  @Post('me/subscription/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async cancelRenewal(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(
      await this.subscriptions.cancelAtPeriodEnd(user.userId, user.role),
      newRequestId(),
    );
  }

  @Post('me/subscription/resume')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async resumeRenewal(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(
      await this.subscriptions.resume(user.userId, user.role),
      newRequestId(),
    );
  }

  /** Downgrade for the next renewal (upgrades go through checkout and apply at once). */
  @Post('me/subscription/scheduled-change')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async scheduleChange(@CurrentUser() user: RequestUser, @Body() dto: ScheduleChangeDto) {
    return createSuccessResponse(
      await this.subscriptions.scheduleChange(user.userId, user.role, dto.packageId),
      newRequestId(),
    );
  }

  @Delete('me/subscription/scheduled-change')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async clearScheduledChange(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(
      await this.subscriptions.clearScheduledChange(user.userId, user.role),
      newRequestId(),
    );
  }

  /** Body carries only the package id; user comes from the session, price from the DB. */
  @Post('payments/checkout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async checkout(@CurrentUser() user: RequestUser, @Body() dto: CheckoutDto) {
    return createSuccessResponse(
      await this.payments.checkout(user.userId, dto.packageId),
      newRequestId(),
    );
  }

  /** Result pages — looked up by the unguessable tran_id, so no session is needed. */
  @Get('payments/orders/:tranId/status')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async orderStatus(@Param('tranId') tranId: string) {
    return createSuccessResponse(await this.payments.publicStatus(tranId), newRequestId());
  }

  // ─── SSLCommerz → us. No JWT, no CSRF: cross-site POSTs from the gateway. Trust comes
  // only from the Order Validation API (PaymentsService.processValidation). ───────────

  @Post('payments/sslcommerz/success')
  async success(@Body() body: GatewayBody, @Res() res: Response) {
    return this.browserCallback('success', body, res);
  }

  @Post('payments/sslcommerz/fail')
  async fail(@Body() body: GatewayBody, @Res() res: Response) {
    return this.browserCallback('fail', body, res);
  }

  @Post('payments/sslcommerz/cancel')
  async cancel(@Body() body: GatewayBody, @Res() res: Response) {
    return this.browserCallback('cancel', body, res);
  }

  /** Server-to-server IPN — the main source of truth (browser may never come back). */
  @Post('payments/sslcommerz/ipn')
  async ipn(@Body() body: GatewayBody, @Res() res: Response) {
    const result = await this.payments.handleCallback('ipn', this.plain(body));
    // 503 asks SSLCommerz to retry when we could not reach its validation API.
    const status = result.outcome === 'GATEWAY_UNAVAILABLE' ? 503 : 200;
    res.status(status).json({ received: true, outcome: result.outcome });
  }

  private async browserCallback(kind: CallbackKind, body: GatewayBody, res: Response) {
    let target: string;
    try {
      const result = await this.payments.handleCallback(kind, this.plain(body));
      target = this.payments.resultRedirectUrl(result.tranId, result.status);
    } catch {
      // Never strand the learner on an API error page; the result page re-reads the status.
      const tranId = typeof body?.tran_id === 'string' ? body.tran_id : null;
      target = this.payments.resultRedirectUrl(tranId, kind === 'cancel' ? 'CANCELLED' : 'PENDING');
    }
    res.redirect(303, target);
  }

  private plain(body: GatewayBody): GatewayBody {
    return body && typeof body === 'object' ? { ...body } : {};
  }
}
