import { createHash } from 'node:crypto';
import { PackageDuration, PaymentOrderStatus, Prisma, UserRole } from '@prisma/client';
import { PaymentsService, toPaisa } from '../payments.service';
import { verifyCallbackSignature, redact } from '../sslcommerz/sslcommerz.client';

const md5 = (s: string) => createHash('md5').update(s).digest('hex');

function sign(fields: Record<string, string>, password: string) {
  const keys = Object.keys(fields);
  const data: Record<string, string> = { ...fields, store_passwd: md5(password) };
  const str = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('&');
  return { ...fields, verify_key: keys.join(','), verify_sign: md5(str) };
}

describe('SSLCommerz helpers', () => {
  it('toPaisa parses only exact decimal amounts', () => {
    expect(toPaisa('499.00')).toBe(49900);
    expect(toPaisa('499')).toBe(49900);
    expect(toPaisa('499.5')).toBe(49950);
    expect(toPaisa('499.0000')).toBe(49900);
    expect(toPaisa('499.001')).toBeNull();
    expect(toPaisa('-1')).toBeNull();
    expect(toPaisa('1e3')).toBeNull();
    expect(toPaisa(undefined)).toBeNull();
  });

  it('verifies the IPN signature and rejects tampering', () => {
    const body = sign(
      { tran_id: 'YA1', val_id: 'V1', amount: '499.00', status: 'VALID' },
      'secret',
    );
    expect(verifyCallbackSignature(body, 'secret')).toBe(true);
    expect(verifyCallbackSignature({ ...body, amount: '1.00' }, 'secret')).toBe(false);
    expect(verifyCallbackSignature(body, 'other')).toBe(false);
    expect(verifyCallbackSignature({ tran_id: 'YA1' }, 'secret')).toBeNull();
  });

  it('redacts passwords and signatures from logs', () => {
    expect(redact({ store_passwd: 'x', verify_sign: 'y', tran_id: 't' })).toEqual({
      store_passwd: '[redacted]',
      verify_sign: '[redacted]',
      tran_id: 't',
    });
  });
});

describe('PaymentsService (DEC-060)', () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;

  const baseOrder = {
    id: '11111111-1111-4111-8111-111111111111',
    tranId: 'YAABCDEF0123456789ABCDEF01',
    userId: 'u1',
    packageId: 'pkg1',
    packageName: 'Monthly',
    duration: PackageDuration.MONTHLY,
    amount: new Prisma.Decimal('499.00'),
    currency: 'BDT',
    status: PaymentOrderStatus.PENDING as PaymentOrderStatus,
    valId: null as string | null,
    bankTranId: null,
    cardType: null,
    gatewayStatus: null,
    riskLevel: null,
    riskTitle: null,
    failureReason: null,
    validatedAt: null,
    appliedAt: null as Date | null,
    lastCheckedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let order: typeof baseOrder;
  let settings: { paidSystemEnabled: boolean };
  const tx = {
    $queryRaw: jest.fn(),
    paymentOrder: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    paymentOrder: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    paymentGatewayLog: { create: jest.fn() },
    user: { findFirst: jest.fn() },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  const subscriptions = { applyPurchase: jest.fn(), toPaymentDto: jest.fn() };
  const packages = { findPurchasable: jest.fn() };
  const service = new PaymentsService(
    prisma as never,
    { get: async () => settings } as never,
    packages as never,
    subscriptions as never,
    { record: jest.fn() } as never,
  );

  const gatewayJson = (json: unknown) =>
    fetchMock.mockResolvedValueOnce({ status: 200, text: async () => JSON.stringify(json) });
  const validResponse = (over: Record<string, unknown> = {}) => ({
    status: 'VALID',
    tran_id: baseOrder.tranId,
    val_id: 'VAL1',
    amount: '499.00',
    currency: 'BDT',
    currency_type: 'BDT',
    currency_amount: '499.00',
    risk_level: '0',
    bank_tran_id: 'B1',
    card_type: 'BKASH-BKash',
    ...over,
  });

  beforeAll(() => {
    global.fetch = fetchMock as never;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SSLCZ_STORE_ID = 'teststore';
    process.env.SSLCZ_STORE_PASSWORD = 'teststore@ssl';
    process.env.SSLCZ_IS_LIVE = 'false';
    settings = { paidSystemEnabled: true };
    order = { ...baseOrder };
    prisma.paymentOrder.findUnique.mockImplementation(async () => order);
    prisma.paymentOrder.updateMany.mockResolvedValue({ count: 1 });
    tx.$queryRaw.mockResolvedValue([]);
    tx.paymentOrder.findUniqueOrThrow.mockImplementation(async () => order);
    tx.paymentOrder.update.mockImplementation(async ({ data }: { data: Partial<typeof order> }) => {
      order = { ...order, ...data };
      return order;
    });
    subscriptions.applyPurchase.mockResolvedValue(new Date('2026-12-24T00:00:00Z'));
  });

  afterEach(() => {
    delete process.env.SSLCZ_STORE_ID;
    delete process.env.SSLCZ_STORE_PASSWORD;
  });

  describe('checkout', () => {
    it('blocks purchases while the paid system is OFF', async () => {
      settings.paidSystemEnabled = false;
      await expect(service.checkout('u1', 'pkg1')).rejects.toMatchObject({ status: 403 });
      expect(prisma.paymentOrder.create).not.toHaveBeenCalled();
    });

    it('answers PAYMENT_NOT_CONFIGURED (503) without credentials', async () => {
      delete process.env.SSLCZ_STORE_ID;
      await expect(service.checkout('u1', 'pkg1')).rejects.toMatchObject({ status: 503 });
    });

    it('uses the DB price + server tran_id and returns the gateway URL', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        name: 'L',
        email: null,
        whatsappNumber: '+8801711111111',
        role: UserRole.USER,
      });
      packages.findPurchasable.mockResolvedValue({
        id: 'pkg1',
        name: 'Monthly',
        duration: PackageDuration.MONTHLY,
        priceBdt: new Prisma.Decimal('499'),
      });
      prisma.paymentOrder.create.mockImplementation(async ({ data }: { data: object }) => ({
        id: 'o1',
        ...data,
      }));
      gatewayJson({ status: 'SUCCESS', GatewayPageURL: 'https://sandbox.sslcommerz.com/pay/x' });

      const res = await service.checkout('u1', 'pkg1');
      expect(res.gatewayUrl).toBe('https://sandbox.sslcommerz.com/pay/x');
      const created = prisma.paymentOrder.create.mock.calls[0][0].data;
      expect(created.amount.toFixed(2)).toBe('499.00');
      expect(created.tranId).toMatch(/^YA[0-9A-F]{24}$/);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://sandbox.sslcommerz.com/gwprocess/v4/api.php');
      const form = new URLSearchParams(init.body as string);
      expect(form.get('total_amount')).toBe('499.00');
      expect(form.get('ipn_url')).toMatch(/\/api\/v1\/payments\/sslcommerz\/ipn$/);
      // The store password never reaches the debug log.
      const logged = JSON.stringify(prisma.paymentGatewayLog.create.mock.calls);
      expect(logged).not.toContain('teststore@ssl');
    });

    it('gateway timeout → 503, order left PENDING', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        name: 'L',
        email: 'a@b.c',
        whatsappNumber: '+880',
        role: UserRole.USER,
      });
      packages.findPurchasable.mockResolvedValue({
        id: 'pkg1',
        name: 'M',
        duration: PackageDuration.MONTHLY,
        priceBdt: new Prisma.Decimal('499'),
      });
      prisma.paymentOrder.create.mockResolvedValue({ id: 'o1' });
      fetchMock.mockRejectedValueOnce(new Error('timeout'));
      await expect(service.checkout('u1', 'pkg1')).rejects.toMatchObject({ status: 503 });
      expect(prisma.paymentOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('callbacks / validation', () => {
    it('valid IPN → validated with the API and applied once', async () => {
      gatewayJson(validResponse());
      const r = await service.handleCallback('ipn', {
        tran_id: order.tranId,
        val_id: 'VAL1',
        status: 'VALID',
      });
      expect(r.outcome).toBe('APPLIED');
      expect(subscriptions.applyPurchase).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toContain('validationserverAPI.php?val_id=VAL1');
      expect(order.status).toBe(PaymentOrderStatus.SUCCESS);
    });

    it('duplicate (IPN then success callback) → second is ALREADY_APPLIED, no double extension', async () => {
      gatewayJson(validResponse());
      await service.handleCallback('ipn', { tran_id: order.tranId, val_id: 'VAL1' });
      const second = await service.handleCallback('success', {
        tran_id: order.tranId,
        val_id: 'VAL1',
      });
      expect(second.outcome).toBe('ALREADY_APPLIED');
      expect(subscriptions.applyPurchase).toHaveBeenCalledTimes(1);
    });

    it('race: order applied by a concurrent request after validation → not applied again', async () => {
      gatewayJson(validResponse());
      tx.paymentOrder.findUniqueOrThrow.mockResolvedValueOnce({ ...order, appliedAt: new Date() });
      const r = await service.handleCallback('success', { tran_id: order.tranId, val_id: 'VAL1' });
      expect(r.outcome).toBe('ALREADY_APPLIED');
      expect(subscriptions.applyPurchase).not.toHaveBeenCalled();
      expect(tx.$queryRaw).toHaveBeenCalled(); // row lock taken
    });

    it.each([
      ['amount mismatch', { amount: '1.00', currency_amount: '1.00' }],
      ['wrong currency', { currency_type: 'USD', currency_amount: '499.00' }],
      ['tran_id of another order', { tran_id: 'YAOTHER000000000000000000' }],
      ['INVALID_TRANSACTION', { status: 'INVALID_TRANSACTION' }],
      ['other store', { store_id: 'evil' }],
    ])('%s → rejected, marked FAILED, nothing applied', async (_label, over) => {
      gatewayJson(validResponse(over));
      const r = await service.handleCallback('success', { tran_id: order.tranId, val_id: 'VAL1' });
      expect(r.outcome).toBe('REJECTED');
      expect(subscriptions.applyPurchase).not.toHaveBeenCalled();
      expect(prisma.paymentOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentOrderStatus.FAILED }),
        }),
      );
    });

    it('fake POST with a bad signature is ignored before any API call', async () => {
      const body = sign(
        { tran_id: order.tranId, val_id: 'VAL1', status: 'VALID' },
        'wrong-password',
      );
      const r = await service.handleCallback('ipn', body);
      expect(r.outcome).toBe('REJECTED');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('correctly signed IPN is accepted', async () => {
      gatewayJson(validResponse());
      const body = sign(
        { tran_id: order.tranId, val_id: 'VAL1', status: 'VALID' },
        'teststore@ssl',
      );
      expect((await service.handleCallback('ipn', body)).outcome).toBe('APPLIED');
    });

    it('risk_level 1 → RISK (held for review), no access', async () => {
      gatewayJson(validResponse({ risk_level: '1', risk_title: 'Card risky' }));
      const r = await service.handleCallback('ipn', { tran_id: order.tranId, val_id: 'VAL1' });
      expect(r.outcome).toBe('RISK');
      expect(subscriptions.applyPurchase).not.toHaveBeenCalled();
      expect(prisma.paymentOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentOrderStatus.RISK }),
        }),
      );
    });

    it('unknown tran_id → UNKNOWN_ORDER, logged', async () => {
      prisma.paymentOrder.findUnique.mockResolvedValue(null);
      const r = await service.handleCallback('success', {
        tran_id: 'YANOPE00000000000000000000',
        val_id: 'X',
      });
      expect(r.outcome).toBe('UNKNOWN_ORDER');
      expect(prisma.paymentGatewayLog.create).toHaveBeenCalled();
    });

    it('validation API unreachable → order stays PENDING (IPN can retry)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
      prisma.paymentOrder.update.mockResolvedValue(order);
      const r = await service.handleCallback('ipn', { tran_id: order.tranId, val_id: 'VAL1' });
      expect(r.outcome).toBe('GATEWAY_UNAVAILABLE');
      expect(subscriptions.applyPurchase).not.toHaveBeenCalled();
      expect(prisma.paymentOrder.updateMany).not.toHaveBeenCalled();
    });

    it('fail / cancel callbacks never grant access', async () => {
      await service.handleCallback('fail', { tran_id: order.tranId, status: 'FAILED' });
      await service.handleCallback('cancel', { tran_id: order.tranId, status: 'CANCELLED' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(subscriptions.applyPurchase).not.toHaveBeenCalled();
      const statuses = prisma.paymentOrder.updateMany.mock.calls.map((c) => c[0].data.status);
      expect(statuses).toEqual([PaymentOrderStatus.FAILED, PaymentOrderStatus.CANCELLED]);
      // Only PENDING orders are relabelled (a SUCCESS is never downgraded).
      expect(prisma.paymentOrder.updateMany.mock.calls[0][0].where).toMatchObject({
        status: PaymentOrderStatus.PENDING,
        appliedAt: null,
      });
    });

    it('a later validated payment still wins over an earlier FAILED label', async () => {
      order = { ...order, status: PaymentOrderStatus.FAILED };
      gatewayJson(validResponse());
      expect(
        (await service.handleCallback('success', { tran_id: order.tranId, val_id: 'VAL1' }))
          .outcome,
      ).toBe('APPLIED');
    });
  });

  describe('re-check (lost IPN)', () => {
    const config = {
      storeId: 'teststore',
      storePassword: 'teststore@ssl',
      isLive: false,
      gatewayBaseUrl: 'https://sandbox.sslcommerz.com',
      callbackBaseUrl: 'x',
      webBaseUrl: 'y',
      timeoutMs: 1000,
    };

    it('finds the VALID transaction by tran_id and applies it', async () => {
      prisma.paymentOrder.update.mockResolvedValue(order);
      gatewayJson({
        APIConnect: 'DONE',
        no_of_trans_found: 1,
        element: [{ status: 'VALID', val_id: 'VAL9', tran_id: order.tranId }],
      });
      gatewayJson(validResponse({ val_id: 'VAL9' }));
      expect(await service.recheckOrder(order, config)).toBe('APPLIED');
      expect(fetchMock.mock.calls[0][0]).toContain('merchantTransIDvalidationAPI.php?tran_id=');
    });

    it('nothing at the gateway after the expiry window → FAILED (abandoned)', async () => {
      order = { ...order, createdAt: new Date(Date.now() - 3 * 3600_000) };
      prisma.paymentOrder.update.mockResolvedValue(order);
      gatewayJson({ APIConnect: 'DONE', no_of_trans_found: 0, element: [] });
      expect(await service.recheckOrder(order, config)).toBe('FAILED');
    });

    it('nothing yet but still young → stays PENDING', async () => {
      prisma.paymentOrder.update.mockResolvedValue(order);
      gatewayJson({ APIConnect: 'DONE', no_of_trans_found: 0, element: [] });
      expect(await service.recheckOrder(order, config)).toBe('PENDING');
      expect(prisma.paymentOrder.updateMany).not.toHaveBeenCalled();
    });
  });

  it('result redirect goes to the web app by status', () => {
    expect(service.resultRedirectUrl('T1', PaymentOrderStatus.SUCCESS)).toMatch(
      /\/payment\/success\?tran_id=T1$/,
    );
    expect(service.resultRedirectUrl('T1', PaymentOrderStatus.CANCELLED)).toMatch(
      /\/payment\/cancelled/,
    );
    expect(service.resultRedirectUrl(null, null)).toMatch(/\/payment\/failed$/);
  });
});
