import { ForbiddenException } from '@nestjs/common';
import { SupportSenderType, UserRole } from '@prisma/client';
import { SupportMessageService } from '../support-message.service';

describe('SupportMessageService unread math', () => {
  const conversations = {
    requireAccessible: jest.fn(),
  };
  const storage = {
    generateSignedDownloadUrl: jest.fn().mockResolvedValue('https://cdn.example/file'),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    supportMessage: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    supportConversation: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    mediaAsset: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    supportInternalNote: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };

  const service = new SupportMessageService(
    prisma as never,
    conversations as never,
    storage as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    conversations.requireAccessible.mockResolvedValue({
      id: 'c1',
      status: 'OPEN',
    });
  });

  it('increments adminUnreadCount when learner sends', async () => {
    const created = {
      id: 'm1',
      conversationId: 'c1',
      senderType: SupportSenderType.USER,
      senderUserId: 'u1',
      clientMessageId: 'cid-1',
      kind: 'TEXT',
      body: 'Hello',
      deliveredAt: new Date(),
      readAt: null,
      createdAt: new Date(),
      attachments: [],
    };
    prisma.supportMessage.create.mockResolvedValue(created);
    prisma.supportConversation.update.mockResolvedValue({});

    await service.sendMessage(
      { kind: 'user', userId: 'u1', role: UserRole.USER, sessionId: 's1' },
      'c1',
      { body: 'Hello', clientMessageId: 'cid-1' },
    );

    expect(prisma.supportConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminUnreadCount: { increment: 1 },
        }),
      }),
    );
  });

  it('increments userUnreadCount when admin sends', async () => {
    const created = {
      id: 'm2',
      conversationId: 'c1',
      senderType: SupportSenderType.ADMIN,
      senderUserId: 'a1',
      clientMessageId: 'cid-2',
      kind: 'TEXT',
      body: 'Hi',
      deliveredAt: new Date(),
      readAt: null,
      createdAt: new Date(),
      attachments: [],
    };
    prisma.supportMessage.create.mockResolvedValue(created);
    prisma.supportConversation.update.mockResolvedValue({});

    await service.sendMessage(
      { kind: 'user', userId: 'a1', role: UserRole.ADMIN, sessionId: 's-a' },
      'c1',
      { body: 'Hi', clientMessageId: 'cid-2' },
    );

    expect(prisma.supportConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userUnreadCount: { increment: 1 },
        }),
      }),
    );
  });

  it('rejects send on closed conversation', async () => {
    conversations.requireAccessible.mockResolvedValue({
      id: 'c1',
      status: 'CLOSED',
    });
    await expect(
      service.sendMessage(
        { kind: 'user', userId: 'u1', role: UserRole.USER, sessionId: 's1' },
        'c1',
        { body: 'Nope' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('clears admin unread on markRead for admin', async () => {
    await service.markRead(
      { kind: 'user', userId: 'a1', role: UserRole.ADMIN, sessionId: 's' },
      'c1',
    );
    expect(prisma.supportConversation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { adminUnreadCount: 0 },
    });
  });

  it('is idempotent on clientMessageId', async () => {
    const existing = {
      id: 'm-existing',
      conversationId: 'c1',
      senderType: SupportSenderType.USER,
      senderUserId: 'u1',
      clientMessageId: 'same',
      kind: 'TEXT',
      body: 'Hello',
      deliveredAt: new Date(),
      readAt: null,
      createdAt: new Date(),
      attachments: [],
    };
    prisma.supportMessage.findUnique.mockResolvedValue(existing);

    const result = await service.sendMessage(
      { kind: 'user', userId: 'u1', role: UserRole.USER, sessionId: 's1' },
      'c1',
      { body: 'Hello', clientMessageId: 'same' },
    );

    expect(result?.id).toBe('m-existing');
    expect(prisma.supportMessage.create).not.toHaveBeenCalled();
  });
});
