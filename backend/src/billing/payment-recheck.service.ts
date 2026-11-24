import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { getSslcommerzConfig } from './sslcommerz/sslcommerz.config';

const num = (raw: string | undefined, fallback: number, min: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? n : fallback;
};

/**
 * DEC-060 — safety net for lost IPNs: every few minutes, ask SSLCommerz about PENDING orders
 * older than PAYMENT_RECHECK_MIN_AGE_MINUTES. Runs in the API (the payment validation logic
 * lives here); rows are claimed with SKIP LOCKED so several replicas never double-process,
 * and applying a payment is idempotent anyway.
 */
@Injectable()
export class PaymentRecheckService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PaymentRecheckService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly payments: PaymentsService) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.PAYMENT_RECHECK_ENABLED === 'false') return;
    const everyMs = num(process.env.PAYMENT_RECHECK_INTERVAL_MINUTES, 10, 1) * 60_000;
    this.timer = setInterval(() => void this.runOnce(), everyMs);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<number> {
    if (this.running) return 0;
    const config = getSslcommerzConfig();
    if (!config) return 0;
    this.running = true;
    try {
      const minAge = num(process.env.PAYMENT_RECHECK_MIN_AGE_MINUTES, 15, 1);
      const orders = await this.payments.claimStalePending(minAge, 25);
      for (const order of orders) {
        try {
          const outcome = await this.payments.recheckOrder(order, config);
          if (outcome !== 'PENDING') this.logger.log(`Re-check ${order.tranId}: ${outcome}`);
        } catch (err) {
          this.logger.error(`Re-check ${order.tranId} failed: ${String(err)}`);
        }
      }
      return orders.length;
    } catch (err) {
      this.logger.error(`Payment re-check run failed: ${String(err)}`);
      return 0;
    } finally {
      this.running = false;
    }
  }
}
