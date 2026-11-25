import 'reflect-metadata';
import { AuditSeverity, UserRole } from '@prisma/client';
import { of, lastValueFrom } from 'rxjs';
import { AuditService, severityForAction } from '../../audit/audit.service';
import { StaffAuditInterceptor } from '../../audit/staff-audit.interceptor';
import { AdminMonitoringService, PURGE_ACTION } from '../admin-monitoring.service';
import { AdminService } from '../admin.service';

describe('DEC-067 audit severity + AuditService', () => {
  it('derives severity from the action name', () => {
    expect(severityForAction('QUESTION_PUBLISH')).toBe('INFO');
    expect(severityForAction('CATEGORY_DELETE')).toBe('WARNING');
    expect(severityForAction('AUTH_LOGIN_FAILED')).toBe('WARNING');
    expect(severityForAction('STAFF_ROLE_CHANGE')).toBe('CRITICAL');
    expect(severityForAction('LOGS_PURGED')).toBe('CRITICAL');
    expect(severityForAction('PASSWORD_RESET_COMPLETED')).toBe('INFO');
  });

  it('keeps a non-UUID target in metadata instead of failing the insert; fills the actor role', async () => {
    const create = jest.fn();
    const prisma = {
      auditLog: { create },
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN' }) },
    };
    await new AuditService(prisma as never).record({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      action: 'PLAN_FEATURE_REORDER',
      entityType: 'PlanFeature',
      entityId: 'FREE',
      metadata: { ids: ['a'] },
    });
    expect(create.mock.calls[0][0].data).toMatchObject({
      entityId: null,
      actorRole: 'ADMIN',
      severity: 'INFO',
      metadata: { ids: ['a'], targetRef: 'FREE' },
    });
  });
});

describe('DEC-067 StaffAuditInterceptor', () => {
  const ctx = (req: Record<string, unknown>) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => req }),
    }) as never;
  const baseReq = (over: Record<string, unknown> = {}) => ({
    method: 'PATCH',
    originalUrl: '/api/v1/admin/users/11111111-1111-4111-8111-111111111111/role',
    route: { path: '/api/v1/admin/users/:id/role' },
    params: { id: '11111111-1111-4111-8111-111111111111' },
    body: { role: 'MODERATOR', password: 'secret', note: 'x'.repeat(200) },
    user: { userId: 'admin-1', role: UserRole.ADMIN },
    ip: '1.2.3.4',
    get: () => 'Mozilla/5.0',
    is: () => false,
    ...over,
  });

  it('logs a staff mutation: role, target, IP/UA, redacted + trimmed body, CRITICAL for role changes', async () => {
    const audit = { record: jest.fn() };
    const i = new StaffAuditInterceptor(audit as never);
    await lastValueFrom(i.intercept(ctx(baseReq()), { handle: () => of({ ok: true }) }));
    const rec = audit.record.mock.calls[0][0];
    expect(rec).toMatchObject({
      actorRole: 'ADMIN',
      action: 'STAFF_PATCH',
      entityType: 'admin/users/:id/role',
      entityId: '11111111-1111-4111-8111-111111111111',
      severity: AuditSeverity.CRITICAL,
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    expect(rec.metadata.body.password).toBe('[redacted]');
    expect(rec.metadata.body.note.length).toBeLessThanOrEqual(118);
  });

  it('skips reads, non-admin paths, learners and the purge route', async () => {
    const audit = { record: jest.fn() };
    const i = new StaffAuditInterceptor(audit as never);
    const run = (r: Record<string, unknown>) =>
      lastValueFrom(i.intercept(ctx(baseReq(r)), { handle: () => of(1) }));
    await run({ method: 'GET' });
    await run({ originalUrl: '/api/v1/me/subscription/cancel', method: 'POST' });
    await run({ user: { userId: 'u', role: UserRole.USER } });
    await run({ originalUrl: '/api/v1/admin/logs/purge', method: 'POST' });
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('SEC-7: logs a staff upload confirm, but not a learner one', async () => {
    const audit = { record: jest.fn() };
    const i = new StaffAuditInterceptor(audit as never);
    const confirm = {
      method: 'POST',
      originalUrl: '/api/v1/storage/confirm',
      route: { path: '/api/v1/storage/confirm' },
      params: {},
      body: { purpose: 'pdf', publicId: 'newspaper/abc.pdf', signature: 'x' },
    };
    await lastValueFrom(i.intercept(ctx(baseReq(confirm)), { handle: () => of(1) }));
    await lastValueFrom(
      i.intercept(ctx(baseReq({ ...confirm, user: { userId: 'u', role: UserRole.USER } })), {
        handle: () => of(1),
      }),
    );
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record.mock.calls[0][0]).toMatchObject({
      action: 'STAFF_POST',
      entityType: 'storage/confirm',
    });
    expect(audit.record.mock.calls[0][0].metadata.body.signature).toBe('[redacted]');
  });
});

describe('DEC-067 AdminMonitoringService — purge', () => {
  const now = new Date('2026-11-26T12:00:00.000Z');
  function setup() {
    const tx = {
      auditLog: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      learningActivityEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 5 }) },
    };
    const prisma = {
      auditLog: { count: jest.fn().mockResolvedValue(3) },
      learningActivityEvent: { count: jest.fn().mockResolvedValue(5) },
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const audit = { record: jest.fn() };
    return { svc: new AdminMonitoringService(prisma as never, audit as never), prisma, tx, audit };
  }
  const admin = { userId: 'admin-1', role: UserRole.ADMIN };

  it('preview: 90-day window, never counts the purge records themselves', async () => {
    const { svc, prisma } = setup();
    const r = await svc.previewPurge({ target: 'all', mode: 'retention' }, now);
    expect(r.counts).toEqual({ audit: 3, activity: 5, total: 8 });
    const where = prisma.auditLog.count.mock.calls[0][0].where;
    expect(where.action).toEqual({ not: PURGE_ACTION });
    expect(where.createdAt.lt.toISOString()).toBe('2026-08-28T12:00:00.000Z');
  });

  it('purge requires typed DELETE and an Admin; writes a CRITICAL purge record', async () => {
    const { svc, tx, audit } = setup();
    const c = { target: 'audit' as const, mode: 'before' as const, before: '2026-10-01T00:00:00Z' };
    await expect(svc.purge({ ...c, confirm: 'delete' }, admin, {}, now)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      svc.purge({ ...c, confirm: 'DELETE' }, { userId: 'm', role: UserRole.MODERATOR }, {}, now),
    ).rejects.toMatchObject({ status: 403 });
    const r = await svc.purge({ ...c, confirm: 'DELETE' }, admin, { ipAddress: '1.1.1.1' }, now);
    expect(r.deleted).toEqual({ audit: 3, activity: 0, total: 3 });
    expect(tx.learningActivityEvent.deleteMany).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PURGE_ACTION,
        severity: 'CRITICAL',
        actorUserId: 'admin-1',
        metadata: expect.objectContaining({ deleted: { audit: 3, activity: 0 } }),
      }),
    );
  });

  it('rejects bad windows (future cutoff, reversed range, missing dates)', async () => {
    const { svc } = setup();
    await expect(
      svc.previewPurge({ target: 'all', mode: 'before', before: '2030-01-01' }, now),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      svc.previewPurge({ target: 'all', mode: 'range', from: '2026-10-02', to: '2026-10-01' }, now),
    ).rejects.toMatchObject({ status: 400 });
    await expect(svc.previewPurge({ target: 'all', mode: 'range' }, now)).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('DEC-067 lookup + activity filters never 500 on bad input', () => {
  it('lookup: full UUID = exact, prefix = parameterized LIKE, text = name/email/WhatsApp', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const queryRaw = jest.fn().mockResolvedValue([{ id: 'abc' }]);
    const prisma = { user: { findMany }, $queryRaw: queryRaw };
    const svc = new AdminMonitoringService(prisma as never, {} as never);
    expect((await svc.lookupUsers('11111111-1111-4111-8111-111111111111')).matchedBy).toBe('id');
    expect(findMany.mock.calls[0][0].where.id).toEqual({
      in: ['11111111-1111-4111-8111-111111111111'],
    });
    expect((await svc.lookupUsers('1a2b3c4d')).matchedBy).toBe('id-prefix');
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect((await svc.lookupUsers("Rahim'; drop")).matchedBy).toBe('text');
    expect((await svc.lookupUsers('x')).items).toEqual([]);
  });

  it('activity events: malformed userId → 400 (not a DB error)', async () => {
    const svc = new AdminService({} as never, {} as never, {} as never);
    await expect(svc.activityEvents({ userId: 'not-a-uuid' })).rejects.toMatchObject({
      status: 400,
    });
    await expect(svc.activityEvents({ from: 'yesterday-ish' })).rejects.toMatchObject({
      status: 400,
    });
  });
});
