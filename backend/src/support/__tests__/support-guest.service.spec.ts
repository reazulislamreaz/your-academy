import { SupportGuestService } from '../support-guest.service';

jest.mock('../../common/utils/crypto', () => ({
  randomToken: () => 'raw-token-value',
  sha256: (v: string) => `hash:${v}`,
}));

jest.mock('../../common/utils/whatsapp', () => ({
  normalizeWhatsapp: (v: string) => v.trim(),
  isValidWhatsapp: () => true,
}));

describe('SupportGuestService linkGuestToUser', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    supportGuestSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    supportConversation: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };

  const service = new SupportGuestService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('links matching guest sessions and conversations to the user', async () => {
    prisma.supportGuestSession.findMany.mockResolvedValue([
      {
        id: 'g1',
        name: 'Guest',
        whatsappNumber: '+8801711111111',
      },
    ]);
    prisma.supportGuestSession.update.mockResolvedValue({});
    prisma.supportConversation.updateMany.mockResolvedValue({ count: 1 });

    const res = { clearCookie: jest.fn() };
    const result = await service.linkGuestToUser('u1', '+8801711111111', res as never);

    expect(result.linked).toBe(1);
    expect(prisma.supportGuestSession.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { linkedUserId: 'u1' },
    });
    expect(prisma.supportConversation.updateMany).toHaveBeenCalledWith({
      where: { guestSessionId: 'g1', userId: null },
      data: {
        userId: 'u1',
        guestName: 'Guest',
        guestWhatsapp: '+8801711111111',
      },
    });
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('no-ops when no guest sessions match', async () => {
    prisma.supportGuestSession.findMany.mockResolvedValue([]);
    const result = await service.linkGuestToUser('u1', '+8801711111111');
    expect(result.linked).toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
