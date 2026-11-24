import { createHash, timingSafeEqual } from 'node:crypto';
import type { SslcommerzConfig } from './sslcommerz.config';

/** Gateway unreachable / timed out / non-JSON — the order must stay PENDING. */
export class GatewayUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GatewayUnavailableError';
  }
}

export type GatewayLogFn = (entry: {
  kind: string;
  tranId: string | null;
  httpStatus: number | null;
  payload: Record<string, unknown>;
}) => Promise<void>;

export type InitSessionParams = {
  tranId: string;
  /** Decimal string with 2 places, e.g. "499.00". */
  amount: string;
  currency: 'BDT';
  productName: string;
  customer: { name: string; email: string; phone: string };
};

export type InitSessionResult = { ok: true; gatewayUrl: string } | { ok: false; reason: string };

/** Fields we read from the Order Validation / Transaction Query APIs (all strings). */
export type GatewayTransaction = {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency?: string;
  currency_type?: string;
  currency_amount?: string;
  bank_tran_id?: string;
  card_type?: string;
  risk_level?: string;
  risk_title?: string;
  store_id?: string;
  [key: string]: unknown;
};

export type TransactionQueryResult = {
  APIConnect?: string;
  no_of_trans_found?: number | string;
  element?: GatewayTransaction[];
  [key: string]: unknown;
};

const SECRET_KEYS = /passw|secret|signature|verify_sign/i;

/** Copy without store password / signatures — safe for logs. */
export function redact(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = SECRET_KEYS.test(k) ? '[redacted]' : v;
  }
  return out;
}

const md5 = (s: string) => createHash('md5').update(s, 'utf8').digest('hex');

/**
 * IPN / callback signature check (SSLCommerz reference algorithm): take the fields listed in
 * `verify_key`, add `store_passwd = md5(store password)`, sort keys, join `k=v` with `&`,
 * md5 → must equal `verify_sign`. Returns null when the post carries no signature.
 */
export function verifyCallbackSignature(
  body: Record<string, unknown>,
  storePassword: string,
): boolean | null {
  const sign = typeof body.verify_sign === 'string' ? body.verify_sign : '';
  const keyList = typeof body.verify_key === 'string' ? body.verify_key : '';
  if (!sign || !keyList) return null;
  const data: Record<string, string> = {};
  for (const key of keyList.split(',')) {
    const k = key.trim();
    if (!k) continue;
    const v = body[k];
    data[k] = v === undefined || v === null ? '' : String(v);
  }
  data.store_passwd = md5(storePassword);
  const hashString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('&');
  const expected = Buffer.from(md5(hashString), 'utf8');
  const given = Buffer.from(sign.toLowerCase(), 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Thin HTTP client for the three SSLCommerz v4 APIs. Every call is logged (redacted). */
export class SslcommerzClient {
  constructor(
    private readonly config: SslcommerzConfig,
    private readonly log: GatewayLogFn,
  ) {}

  async initSession(p: InitSessionParams): Promise<InitSessionResult> {
    const cb = this.config.callbackBaseUrl;
    const form: Record<string, string> = {
      store_id: this.config.storeId,
      store_passwd: this.config.storePassword,
      total_amount: p.amount,
      currency: p.currency,
      tran_id: p.tranId,
      success_url: `${cb}/success`,
      fail_url: `${cb}/fail`,
      cancel_url: `${cb}/cancel`,
      ipn_url: `${cb}/ipn`,
      product_name: p.productName.slice(0, 250),
      product_category: 'Subscription',
      product_profile: 'non-physical-goods',
      num_of_item: '1',
      shipping_method: 'NO',
      cus_name: p.customer.name.slice(0, 50),
      cus_email: p.customer.email,
      cus_phone: p.customer.phone,
      cus_add1: 'N/A',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      value_a: p.tranId,
    };
    const url = `${this.config.gatewayBaseUrl}/gwprocess/v4/api.php`;
    await this.log({
      kind: 'INIT_REQUEST',
      tranId: p.tranId,
      httpStatus: null,
      payload: redact(form),
    });
    const { status, json } = await this.request(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(form).toString(),
      },
      'INIT',
      p.tranId,
    );
    await this.log({
      kind: 'INIT_RESPONSE',
      tranId: p.tranId,
      httpStatus: status,
      payload: redact(json),
    });

    const gatewayUrl = typeof json.GatewayPageURL === 'string' ? json.GatewayPageURL : '';
    if (
      String(json.status ?? '').toUpperCase() === 'SUCCESS' &&
      gatewayUrl.startsWith('https://')
    ) {
      return { ok: true, gatewayUrl };
    }
    const reason =
      typeof json.failedreason === 'string' && json.failedreason
        ? json.failedreason
        : 'Gateway did not return a payment page';
    return { ok: false, reason };
  }

  /** Order Validation API — the only proof a payment is real. */
  async validate(valId: string, tranId: string | null): Promise<GatewayTransaction> {
    const qs = new URLSearchParams({
      val_id: valId,
      store_id: this.config.storeId,
      store_passwd: this.config.storePassword,
      v: '1',
      format: 'json',
    });
    const url = `${this.config.gatewayBaseUrl}/validator/api/validationserverAPI.php?${qs}`;
    await this.log({
      kind: 'VALIDATE_REQUEST',
      tranId,
      httpStatus: null,
      payload: { val_id: valId },
    });
    const { status, json } = await this.request(url, { method: 'GET' }, 'VALIDATE', tranId);
    await this.log({
      kind: 'VALIDATE_RESPONSE',
      tranId,
      httpStatus: status,
      payload: redact(json),
    });
    return json as GatewayTransaction;
  }

  /** Transaction Query API by our tran_id — used when no callback ever arrived. */
  async queryByTranId(tranId: string): Promise<TransactionQueryResult> {
    const qs = new URLSearchParams({
      tran_id: tranId,
      store_id: this.config.storeId,
      store_passwd: this.config.storePassword,
      format: 'json',
    });
    const url = `${this.config.gatewayBaseUrl}/validator/api/merchantTransIDvalidationAPI.php?${qs}`;
    await this.log({
      kind: 'QUERY_REQUEST',
      tranId,
      httpStatus: null,
      payload: { tran_id: tranId },
    });
    const { status, json } = await this.request(url, { method: 'GET' }, 'QUERY', tranId);
    await this.log({ kind: 'QUERY_RESPONSE', tranId, httpStatus: status, payload: redact(json) });
    return json as TransactionQueryResult;
  }

  private async request(
    url: string,
    init: RequestInit,
    label: string,
    tranId: string | null,
  ): Promise<{ status: number; json: Record<string, unknown> }> {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(this.config.timeoutMs) });
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      await this.log({
        kind: `${label}_ERROR`,
        tranId,
        httpStatus: null,
        payload: { error: message },
      });
      throw new GatewayUnavailableError(`SSLCommerz ${label} request failed (${message})`);
    }
    const text = await res.text();
    try {
      const json = JSON.parse(text) as unknown;
      if (json && typeof json === 'object' && !Array.isArray(json)) {
        return { status: res.status, json: json as Record<string, unknown> };
      }
    } catch {
      // handled below
    }
    await this.log({
      kind: `${label}_ERROR`,
      tranId,
      httpStatus: res.status,
      payload: { error: 'Non-JSON response', body: text.slice(0, 500) },
    });
    throw new GatewayUnavailableError(`SSLCommerz ${label} returned HTTP ${res.status} (not JSON)`);
  }
}
