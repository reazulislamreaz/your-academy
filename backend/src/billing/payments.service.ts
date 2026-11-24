import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentOrderStatus, Prisma, UserRole, type PaymentOrder } from '@prisma/client';
import {
  createErrorResponse,
  PACKAGE_DURATION_LABELS,
  type AdminPaymentOrderDto,
  type CheckoutResult,
  type PaymentOrderPublicStatus,
} from '@your-academy/shared';
import { randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { paginateById } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { PackagesService } from './packages.service';
import { SiteSettingsService } from './site-settings.service';
import {
  GatewayUnavailableError,
  SslcommerzClient,
  redact,
  verifyCallbackSignature,
  type GatewayTransaction,
} from './sslcommerz/sslcommerz.client';
import {
  getSslcommerzConfig,
  getWebBaseUrl,
  type SslcommerzConfig,
} from './sslcommerz/sslcommerz.config';
import { SubscriptionsService } from './subscriptions.service';

export type CallbackKind = 'success' | 'fail' | 'cancel' | 'ipn';

/** Outcome of processing one gateway message / re-check. */
export type ProcessOutcome =
  | 'APPLIED'
  | 'ALREADY_APPLIED'
  | 'PENDING'
  | 'GATEWAY_UNAVAILABLE'
  | 'RISK'
  | 'FAILED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'UNKNOWN_ORDER';

/** SSLCommerz minimum / maximum single transaction (BDT). */
export const MIN_AMOUNT_BDT = 10;
export const MAX_AMOUNT_BDT = 500_000;
const TRAN_ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
/** Orders may move to SUCCESS from these (a later, API-validated payment wins). */
const APPLICABLE: PaymentOrderStatus[] = [
  PaymentOrderStatus.PENDING,
  PaymentOrderStatus.FAILED,
  PaymentOrderStatus.CANCELLED,
];

/** Decimal string → integer paisa; null for anything that is not a plain amount. */
export function toPaisa(value: unknown): number | null {
  const s =
    typeof value === 'number' ? value.toFixed(2) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d+(\.\d{1,4})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const paisa = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  // Anything below a paisa must be zero, or the amount is not what we charged.
  if (frac.length > 2 && Number(frac.slice(2)) !== 0) return null;
  return paisa;
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null;

/**
 * DEC-060 — SSLCommerz checkout, callbacks, IPN and re-checks. A subscription is extended
 * only after the Order Validation API confirms the payment and every field matches the
 * stored order; the order row lock + `appliedAt` make that happen exactly once.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SiteSettingsService,
    private readonly packages: PackagesService,
    private readonly subscriptions: SubscriptionsService,
    private readonly audit: AuditService,
  ) {}

  isConfigured(): boolean {
    return getSslcommerzConfig() !== null;
  }

  // ─── Checkout ───────────────────────────────────────────────────────────────

  async checkout(userId: string, packageId: string): Promise<CheckoutResult> {
    const settings = await this.settings.get();
    if (!settings.paidSystemEnabled) {
      throw new ForbiddenException(
        createErrorResponse(
          'PAID_SYSTEM_OFF',
          'Purchases are turned off — all content is currently free',
          newRequestId(),
        ),
      );
    }
    const config = this.requireConfig();
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, email: true, whatsappNumber: true, role: true },
    });
    if (!user) {
      throw new NotFoundException(
        createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()),
      );
    }
    if (user.role === UserRole.ADMIN) {
      throw new ConflictException(
        createErrorResponse(
          'SUBSCRIPTION_NOT_NEEDED',
          'Admins already have full access',
          newRequestId(),
        ),
      );
    }
    // Price, package and user come from the database only — never from the request body.
    const pkg = await this.packages.findPurchasable(packageId);
    const amount = pkg.priceBdt;
    if (amount.lt(MIN_AMOUNT_BDT) || amount.gt(MAX_AMOUNT_BDT)) {
      throw new ConflictException(
        createErrorResponse(
          'PACKAGE_PRICE_INVALID',
          `This package's price must be between ৳${MIN_AMOUNT_BDT} and ৳${MAX_AMOUNT_BDT} to be paid online`,
          newRequestId(),
        ),
      );
    }

    const tranId = `YA${randomBytes(12).toString('hex').toUpperCase()}`;
    const order = await this.prisma.paymentOrder.create({
      data: {
        tranId,
        userId: user.id,
        packageId: pkg.id,
        packageName: pkg.name,
        duration: pkg.duration,
        amount,
        currency: 'BDT',
      },
    });

    let init;
    try {
      init = await this.client(config).initSession({
        tranId,
        amount: amount.toFixed(2),
        currency: 'BDT',
        productName: `${pkg.name} (${PACKAGE_DURATION_LABELS[pkg.duration]})`,
        customer: {
          name: user.name,
          email: user.email ?? `noreply@${new URL(getWebBaseUrl()).hostname}`,
          phone: user.whatsappNumber,
        },
      });
    } catch (err) {
      if (err instanceof GatewayUnavailableError) {
        // Order stays PENDING; the re-check job closes it if no payment ever happens.
        throw new ServiceUnavailableException(
          createErrorResponse(
            'PAYMENT_GATEWAY_UNAVAILABLE',
            'The payment gateway is not responding. No money was taken — please try again in a few minutes.',
            newRequestId(),
          ),
        );
      }
      throw err;
    }
    if (!init.ok) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentOrderStatus.FAILED,
          failureReason: `Gateway session: ${init.reason}`.slice(0, 300),
        },
      });
      throw new HttpException(
        createErrorResponse(
          'PAYMENT_GATEWAY_ERROR',
          'The payment gateway could not start this payment. Please try again later.',
          newRequestId(),
        ),
        HttpStatus.BAD_GATEWAY,
      );
    }
    return { tranId, gatewayUrl: init.gatewayUrl };
  }

  // ─── Gateway callbacks (no session, no CSRF — trust comes from API validation) ────

  /**
   * success / fail / cancel (browser POST) and IPN (server POST). Never trusts the posted
   * status for granting access: only `processValidation` can apply a payment.
   */
  async handleCallback(
    kind: CallbackKind,
    body: Record<string, unknown>,
  ): Promise<{
    tranId: string | null;
    outcome: ProcessOutcome;
    status: PaymentOrderStatus | null;
  }> {
    const rawTranId = str(body.tran_id);
    const tranId = rawTranId && TRAN_ID_RE.test(rawTranId) ? rawTranId : null;
    await this.writeLog({
      kind: `CALLBACK_${kind.toUpperCase()}`,
      tranId,
      httpStatus: null,
      payload: redact(body),
    });
    if (!tranId) return { tranId: null, outcome: 'UNKNOWN_ORDER', status: null };

    const order = await this.prisma.paymentOrder.findUnique({ where: { tranId } });
    if (!order) {
      this.logger.warn(`SSLCommerz ${kind} for unknown tran_id ${tranId}`);
      return { tranId, outcome: 'UNKNOWN_ORDER', status: null };
    }
    const config = getSslcommerzConfig();
    if (!config) {
      this.logger.error(`SSLCommerz ${kind} received but payments are not configured`);
      return { tranId, outcome: 'GATEWAY_UNAVAILABLE', status: order.status };
    }

    const signature = verifyCallbackSignature(body, config.storePassword);
    if (signature === false) {
      await this.writeLog({
        kind: 'SIGNATURE_MISMATCH',
        tranId,
        httpStatus: null,
        payload: { callback: kind },
      });
      this.logger.warn(`SSLCommerz ${kind} signature mismatch for ${tranId} — ignored`);
      return { tranId, outcome: 'REJECTED', status: order.status };
    }
    const postedStore = str(body.store_id);
    if (postedStore && postedStore !== config.storeId) {
      await this.writeLog({
        kind: 'STORE_MISMATCH',
        tranId,
        httpStatus: null,
        payload: { callback: kind },
      });
      return { tranId, outcome: 'REJECTED', status: order.status };
    }

    const valId = str(body.val_id);
    const postedStatus = (str(body.status) ?? '').toUpperCase();
    let outcome: ProcessOutcome;
    if (valId && (kind === 'success' || kind === 'ipn')) {
      outcome = await this.processValidation(order, valId, config, kind);
    } else if (kind === 'cancel' || postedStatus === 'CANCELLED') {
      outcome = await this.markIfOpen(
        order.id,
        PaymentOrderStatus.CANCELLED,
        'Cancelled at gateway',
      );
    } else if (kind === 'fail' || ['FAILED', 'EXPIRED', 'UNATTEMPTED'].includes(postedStatus)) {
      outcome = await this.markIfOpen(
        order.id,
        PaymentOrderStatus.FAILED,
        `Gateway reported ${postedStatus || 'failure'}${str(body.error) ? `: ${str(body.error)}` : ''}`,
      );
    } else {
      // success / IPN without val_id: cannot be validated — ask the gateway directly.
      outcome = await this.recheckOrder(order, config);
    }
    const fresh = await this.prisma.paymentOrder.findUnique({
      where: { id: order.id },
      select: { status: true },
    });
    return { tranId, outcome, status: fresh?.status ?? null };
  }

  /** Where the learner's browser goes after a gateway callback. */
  resultRedirectUrl(tranId: string | null, status: PaymentOrderStatus | null): string {
    const base = getWebBaseUrl();
    const page =
      status === PaymentOrderStatus.CANCELLED
        ? 'cancelled'
        : status === PaymentOrderStatus.SUCCESS ||
            status === PaymentOrderStatus.PENDING ||
            status === PaymentOrderStatus.RISK
          ? 'success'
          : 'failed';
    return `${base}/payment/${page}${tranId ? `?tran_id=${encodeURIComponent(tranId)}` : ''}`;
  }

  // ─── Validation + apply ─────────────────────────────────────────────────────

  async processValidation(
    order: PaymentOrder,
    valId: string,
    config: SslcommerzConfig,
    source: string,
    opts: { allowRisk?: boolean } = {},
  ): Promise<ProcessOutcome> {
    if (order.appliedAt) return 'ALREADY_APPLIED';
    let v: GatewayTransaction;
    try {
      v = await this.client(config).validate(valId, order.tranId);
    } catch (err) {
      if (err instanceof GatewayUnavailableError) {
        await this.touch(order.id);
        return 'GATEWAY_UNAVAILABLE';
      }
      throw err;
    }

    const gwStatus = (str(v.status) ?? '').toUpperCase();
    const reject = async (reason: string): Promise<ProcessOutcome> => {
      this.logger.warn(`Payment ${order.tranId} rejected (${source}): ${reason}`);
      await this.writeLog({
        kind: 'VALIDATION_REJECTED',
        tranId: order.tranId,
        httpStatus: null,
        payload: { reason, source },
      });
      await this.markIfOpen(order.id, PaymentOrderStatus.FAILED, reason, {
        gatewayStatus: gwStatus || null,
      });
      return 'REJECTED';
    };

    if (gwStatus !== 'VALID' && gwStatus !== 'VALIDATED') {
      return reject(`Validation API status ${gwStatus || 'missing'}`);
    }
    if (str(v.tran_id) !== order.tranId) return reject('tran_id does not match the order');
    const store = str(v.store_id);
    if (store && store !== config.storeId) return reject('store_id does not match');
    // `currency_type` / `currency_amount` = what the customer was charged in; `currency` /
    // `amount` = settlement. Both must be BDT and equal to the stored order amount.
    const currency = (str(v.currency_type) ?? str(v.currency) ?? '').toUpperCase();
    const settleCurrency = (str(v.currency) ?? '').toUpperCase();
    if (currency !== order.currency || (settleCurrency && settleCurrency !== order.currency)) {
      return reject(`Currency ${currency || '?'} does not match ${order.currency}`);
    }
    const expected = toPaisa(order.amount.toFixed(2));
    const charged = toPaisa(v.currency_amount ?? v.amount);
    const settled = toPaisa(v.amount);
    if (charged === null || charged !== expected || (settled !== null && settled !== expected)) {
      return reject(
        `Amount ${String(v.currency_amount ?? v.amount)} does not match ${order.amount.toFixed(2)}`,
      );
    }

    const details = {
      valId,
      bankTranId: str(v.bank_tran_id)?.slice(0, 100) ?? null,
      cardType: str(v.card_type)?.slice(0, 80) ?? null,
      gatewayStatus: gwStatus,
      riskLevel: Number.isFinite(Number(v.risk_level)) ? Number(v.risk_level) : null,
      riskTitle: str(v.risk_title)?.slice(0, 200) ?? null,
      validatedAt: new Date(),
      lastCheckedAt: new Date(),
    };

    if (details.riskLevel === 1 && !opts.allowRisk) {
      const updated = await this.prisma.paymentOrder.updateMany({
        where: { id: order.id, appliedAt: null, status: { in: APPLICABLE } },
        data: {
          ...details,
          status: PaymentOrderStatus.RISK,
          failureReason: 'Held for review: gateway risk flag',
        },
      });
      if (updated.count) this.logger.warn(`Payment ${order.tranId} held for review (risk_level 1)`);
      return 'RISK';
    }

    return this.prisma.$transaction(async (tx) => {
      // Row lock: IPN and success callback for one order run one after the other.
      await tx.$queryRaw`SELECT id FROM payment_orders WHERE id = ${order.id}::uuid FOR UPDATE`;
      const locked = await tx.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
      if (locked.appliedAt) return 'ALREADY_APPLIED' as const;
      const allowed = opts.allowRisk ? [...APPLICABLE, PaymentOrderStatus.RISK] : APPLICABLE;
      if (!allowed.includes(locked.status)) return 'REJECTED' as const;
      const now = new Date();
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          ...details,
          status: PaymentOrderStatus.SUCCESS,
          failureReason: null,
          appliedAt: now,
        },
      });
      await this.subscriptions.applyPurchase(tx, locked, now);
      this.logger.log(`Payment ${order.tranId} applied (${source})`);
      return 'APPLIED' as const;
    });
  }

  /**
   * Transaction Query API by tran_id — for orders whose callback / IPN never arrived.
   * No transaction at the gateway after the expiry window → FAILED (abandoned checkout).
   */
  async recheckOrder(order: PaymentOrder, config: SslcommerzConfig): Promise<ProcessOutcome> {
    if (order.appliedAt) return 'ALREADY_APPLIED';
    if (order.valId && order.status !== PaymentOrderStatus.RISK) {
      return this.processValidation(order, order.valId, config, 'recheck');
    }
    let result;
    try {
      result = await this.client(config).queryByTranId(order.tranId);
    } catch (err) {
      if (err instanceof GatewayUnavailableError) {
        await this.touch(order.id);
        return 'GATEWAY_UNAVAILABLE';
      }
      throw err;
    }
    await this.touch(order.id);
    const elements = Array.isArray(result.element) ? result.element : [];
    const valid = elements.find((e) =>
      ['VALID', 'VALIDATED'].includes((str(e.status) ?? '').toUpperCase()),
    );
    if (valid && str(valid.val_id)) {
      return this.processValidation(order, str(valid.val_id)!, config, 'recheck');
    }
    if (order.status !== PaymentOrderStatus.PENDING) return 'PENDING';
    const statuses = elements.map((e) => (str(e.status) ?? '').toUpperCase());
    if (statuses.includes('PENDING') || statuses.includes('PROCESSING')) return 'PENDING';
    if (statuses.includes('CANCELLED')) {
      return this.markIfOpen(order.id, PaymentOrderStatus.CANCELLED, 'Cancelled at gateway');
    }
    if (
      statuses.some((s) => ['FAILED', 'EXPIRED', 'UNATTEMPTED', 'INVALID_TRANSACTION'].includes(s))
    ) {
      return this.markIfOpen(
        order.id,
        PaymentOrderStatus.FAILED,
        `Gateway reported ${statuses.join(', ')}`,
      );
    }
    const connected = String(result.APIConnect ?? '').toUpperCase() === 'DONE';
    const ageMin = (Date.now() - order.createdAt.getTime()) / 60_000;
    if (connected && elements.length === 0 && ageMin >= pendingExpiryMinutes()) {
      return this.markIfOpen(
        order.id,
        PaymentOrderStatus.FAILED,
        'No payment found at the gateway (checkout abandoned)',
      );
    }
    return 'PENDING';
  }

  // ─── Public / learner reads ─────────────────────────────────────────────────

  /** Result page lookup by the unguessable tran_id (works after logout). */
  async publicStatus(tranId: string): Promise<PaymentOrderPublicStatus> {
    const order = TRAN_ID_RE.test(tranId)
      ? await this.prisma.paymentOrder.findUnique({
          where: { tranId },
          include: {
            events: { select: { newEndsAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        })
      : null;
    if (!order) {
      throw new NotFoundException(
        createErrorResponse('PAYMENT_NOT_FOUND', 'Payment not found', newRequestId()),
      );
    }
    return {
      tranId: order.tranId,
      status: order.status,
      packageName: order.packageName,
      amount: order.amount.toFixed(2),
      currency: order.currency,
      subscriptionEndsAt: order.appliedAt
        ? (order.events[0]?.newEndsAt?.toISOString() ?? null)
        : null,
    };
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async adminList(params: {
    status?: PaymentOrderStatus;
    q?: string;
    packageId?: string;
    from?: Date;
    to?: Date;
    cursor?: string;
    limit: number;
  }) {
    const q = params.q?.trim();
    const where: Prisma.PaymentOrderWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.packageId ? { packageId: params.packageId } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lt: params.to } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { tranId: { contains: q, mode: 'insensitive' } },
              { valId: { contains: q, mode: 'insensitive' } },
              { user: { name: { contains: q, mode: 'insensitive' } } },
              { user: { whatsappNumber: { contains: q } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        take: params.limit + 1,
        ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { user: { select: { id: true, name: true, whatsappNumber: true, email: true } } },
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);
    const page = paginateById(rows, params.limit);
    return { items: page.items.map((r) => this.toAdminDto(r)), nextCursor: page.nextCursor, total };
  }

  async adminRecheck(
    id: string,
    actorUserId: string,
  ): Promise<{ outcome: ProcessOutcome; order: AdminPaymentOrderDto }> {
    const config = this.requireConfig();
    const order = await this.findOrder(id);
    const outcome = await this.recheckOrder(order, config);
    await this.audit.record({
      actorUserId,
      action: 'PAYMENT_RECHECK',
      entityType: 'PaymentOrder',
      entityId: id,
      metadata: { outcome },
    });
    return { outcome, order: await this.adminGet(id) };
  }

  /** Admin accepts a RISK-held payment after review (still re-validated with the gateway). */
  async adminApproveRisk(id: string, actorUserId: string) {
    const config = this.requireConfig();
    const order = await this.findOrder(id);
    if (order.status !== PaymentOrderStatus.RISK || !order.valId) {
      throw new ConflictException(
        createErrorResponse(
          'PAYMENT_NOT_HELD',
          'Only payments held for review can be approved',
          newRequestId(),
        ),
      );
    }
    const outcome = await this.processValidation(order, order.valId, config, 'admin-approve', {
      allowRisk: true,
    });
    await this.audit.record({
      actorUserId,
      action: 'PAYMENT_APPROVE_RISK',
      entityType: 'PaymentOrder',
      entityId: id,
      metadata: { outcome },
    });
    return { outcome, order: await this.adminGet(id) };
  }

  /** Bookkeeping only (refund itself happens in the SSLCommerz panel); access is unchanged. */
  async adminMarkRefunded(id: string, actorUserId: string, note?: string) {
    const order = await this.findOrder(id);
    if (order.status !== PaymentOrderStatus.SUCCESS && order.status !== PaymentOrderStatus.RISK) {
      throw new ConflictException(
        createErrorResponse(
          'PAYMENT_NOT_REFUNDABLE',
          'Only successful or held payments can be marked refunded',
          newRequestId(),
        ),
      );
    }
    await this.prisma.paymentOrder.update({
      where: { id },
      data: {
        status: PaymentOrderStatus.REFUNDED,
        failureReason: note?.trim().slice(0, 300) || 'Marked refunded by admin',
      },
    });
    await this.audit.record({
      actorUserId,
      action: 'PAYMENT_MARK_REFUNDED',
      entityType: 'PaymentOrder',
      entityId: id,
      metadata: { note: note ?? null },
    });
    return this.adminGet(id);
  }

  async adminGet(id: string): Promise<AdminPaymentOrderDto> {
    const row = await this.prisma.paymentOrder.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, whatsappNumber: true, email: true } } },
    });
    if (!row)
      throw new NotFoundException(
        createErrorResponse('PAYMENT_NOT_FOUND', 'Payment not found', newRequestId()),
      );
    return this.toAdminDto(row);
  }

  async adminLogs(id: string) {
    const order = await this.findOrder(id);
    const rows = await this.prisma.paymentGatewayLog.findMany({
      where: { OR: [{ paymentOrderId: order.id }, { tranId: order.tranId }] },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      httpStatus: r.httpStatus,
      payload: r.payload,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  /** Claims stale PENDING orders (SKIP LOCKED → safe with several API replicas). */
  async claimStalePending(minAgeMinutes: number, limit: number): Promise<PaymentOrder[]> {
    const ids = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE payment_orders SET last_checked_at = NOW()
      WHERE id IN (
        SELECT id FROM payment_orders
        WHERE status = 'PENDING'
          AND created_at < NOW() - make_interval(mins => ${minAgeMinutes}::int)
          AND created_at > NOW() - INTERVAL '7 days'
          AND (last_checked_at IS NULL OR last_checked_at < NOW() - make_interval(mins => ${minAgeMinutes}::int))
        ORDER BY created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`;
    if (!ids.length) return [];
    return this.prisma.paymentOrder.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private requireConfig(): SslcommerzConfig {
    const config = getSslcommerzConfig();
    if (!config) {
      throw new ServiceUnavailableException(
        createErrorResponse(
          'PAYMENT_NOT_CONFIGURED',
          'Online payment is not configured yet. Please contact support.',
          newRequestId(),
        ),
      );
    }
    return config;
  }

  private client(config: SslcommerzConfig) {
    return new SslcommerzClient(config, (e) => this.writeLog(e));
  }

  private async findOrder(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { id } });
    if (!order)
      throw new NotFoundException(
        createErrorResponse('PAYMENT_NOT_FOUND', 'Payment not found', newRequestId()),
      );
    return order;
  }

  /** Status change only while unpaid; never downgrades SUCCESS / RISK / REFUNDED. */
  private async markIfOpen(
    id: string,
    status: PaymentOrderStatus,
    reason: string,
    extra: Prisma.PaymentOrderUpdateManyMutationInput = {},
  ): Promise<ProcessOutcome> {
    await this.prisma.paymentOrder.updateMany({
      where: { id, appliedAt: null, status: PaymentOrderStatus.PENDING },
      data: { status, failureReason: reason.slice(0, 300), lastCheckedAt: new Date(), ...extra },
    });
    return status === PaymentOrderStatus.CANCELLED ? 'CANCELLED' : 'FAILED';
  }

  private async touch(id: string) {
    await this.prisma.paymentOrder.update({ where: { id }, data: { lastCheckedAt: new Date() } });
  }

  /** Gateway debug log — must never break the payment flow. */
  private async writeLog(e: {
    kind: string;
    tranId: string | null;
    httpStatus: number | null;
    payload: Record<string, unknown>;
  }) {
    try {
      const order = e.tranId
        ? await this.prisma.paymentOrder.findUnique({
            where: { tranId: e.tranId },
            select: { id: true },
          })
        : null;
      await this.prisma.paymentGatewayLog.create({
        data: {
          kind: e.kind.slice(0, 40),
          tranId: e.tranId?.slice(0, 64) ?? null,
          paymentOrderId: order?.id ?? null,
          httpStatus: e.httpStatus,
          payload: JSON.parse(JSON.stringify(e.payload)) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write gateway log: ${String(err)}`);
    }
  }

  private toAdminDto(
    r: PaymentOrder & {
      user: { id: string; name: string; whatsappNumber: string; email: string | null };
    },
  ): AdminPaymentOrderDto {
    return {
      ...this.subscriptions.toPaymentDto(r),
      id: r.id,
      valId: r.valId,
      bankTranId: r.bankTranId,
      cardType: r.cardType,
      gatewayStatus: r.gatewayStatus,
      riskLevel: r.riskLevel,
      riskTitle: r.riskTitle,
      failureReason: r.failureReason,
      appliedAt: r.appliedAt?.toISOString() ?? null,
      lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
      user: r.user,
    };
  }
}

export function pendingExpiryMinutes(): number {
  const n = Number(process.env.PAYMENT_PENDING_EXPIRE_MINUTES ?? 120);
  return Number.isFinite(n) && n >= 30 ? n : 120;
}
