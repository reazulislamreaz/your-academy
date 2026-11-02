import { BrowsingSessionStatus } from '@prisma/client';
import { AnalyticsService } from '../analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    browsingSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new AnalyticsService(prisma as never);
  const user = { userId: 'u1', role: 'USER' as const, sessionId: 's1' };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
  });

  it('reattaches existing ACTIVE session for same client', async () => {
    prisma.browsingSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      clientInstanceId: 'tab-a',
      status: BrowsingSessionStatus.ACTIVE,
    });
    prisma.browsingSession.update.mockResolvedValue({ id: 'sess-1', clientInstanceId: 'tab-a' });

    await expect(service.start(user, 'tab-a')).resolves.toMatchObject({ id: 'sess-1' });
    expect(prisma.browsingSession.create).not.toHaveBeenCalled();
  });

  it('returns existing ACTIVE session for a different tab without creating', async () => {
    prisma.browsingSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      clientInstanceId: 'tab-a',
      status: BrowsingSessionStatus.ACTIVE,
    });

    await expect(service.start(user, 'tab-b')).resolves.toMatchObject({ id: 'sess-1' });
    expect(prisma.browsingSession.create).not.toHaveBeenCalled();
  });

  it('does not accrue when visibility is hidden', async () => {
    prisma.browsingSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      userId: 'u1',
      status: BrowsingSessionStatus.ACTIVE,
      accruedSeconds: 10,
      lastHeartbeatAt: new Date(),
      clientInstanceId: 'tab-a',
    });

    await expect(
      service.heartbeat(user, 'sess-1', { visibilityState: 'hidden', clientInstanceId: 'tab-a' }),
    ).resolves.toMatchObject({ paused: true, accruedSeconds: 10 });
    expect(prisma.browsingSession.update).not.toHaveBeenCalled();
  });

  it('ignores non-owner heartbeat without stealing ownership', async () => {
    prisma.browsingSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      userId: 'u1',
      status: BrowsingSessionStatus.ACTIVE,
      accruedSeconds: 40,
      lastHeartbeatAt: new Date(Date.now() - 30_000),
      clientInstanceId: 'tab-a',
    });

    await expect(
      service.heartbeat(user, 'sess-1', {
        visibilityState: 'visible',
        clientInstanceId: 'tab-b',
      }),
    ).resolves.toMatchObject({ ignored: true, accruedSeconds: 40 });
    expect(prisma.browsingSession.update).not.toHaveBeenCalled();
  });

  it('clamps heartbeat increment to 35 seconds', async () => {
    prisma.browsingSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      userId: 'u1',
      status: BrowsingSessionStatus.ACTIVE,
      accruedSeconds: 0,
      lastHeartbeatAt: new Date(Date.now() - 120_000),
      clientInstanceId: 'tab-a',
    });
    prisma.browsingSession.update.mockImplementation(async ({ data }: { data: { accruedSeconds: number } }) => data);

    const result = await service.heartbeat(user, 'sess-1', {
      visibilityState: 'visible',
      clientInstanceId: 'tab-a',
    });
    expect(result).toMatchObject({ accruedSeconds: 35 });
  });
});
