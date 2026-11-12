import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportConversationStatus, UserRole } from '@prisma/client';
import { SupportConversationService } from '../support-conversation.service';

describe('SupportConversationService access', () => {
  const prisma = {
    supportConversation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const service = new SupportConversationService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses open conversation for learner', async () => {
    const existing = {
      id: 'c1',
      status: SupportConversationStatus.OPEN,
      userId: 'u1',
      guestSessionId: null,
      guestName: null,
      guestWhatsapp: null,
      assignedAdminId: null,
      subject: 'Support',
      lastMessageAt: null,
      lastMessagePreview: null,
      userUnreadCount: 0,
      adminUnreadCount: 0,
      closedAt: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'u1', name: 'Ada' },
    };
    prisma.supportConversation.findFirst.mockResolvedValue(existing);

    const result = await service.getOrCreateMine({
      kind: 'user',
      userId: 'u1',
      role: UserRole.USER,
      sessionId: 's1',
    });

    expect(result.id).toBe('c1');
    expect(prisma.supportConversation.create).not.toHaveBeenCalled();
  });

  it('blocks guest from another guest conversation (IDOR)', async () => {
    prisma.supportConversation.findUnique.mockResolvedValue({
      id: 'c2',
      status: SupportConversationStatus.OPEN,
      userId: null,
      guestSessionId: 'g-other',
      guestName: 'Bob',
      guestWhatsapp: '+8801',
      assignedAdminId: null,
      subject: 'Support',
      lastMessageAt: null,
      lastMessagePreview: null,
      userUnreadCount: 0,
      adminUnreadCount: 1,
      closedAt: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
    });

    await expect(
      service.requireAccessible(
        { kind: 'guest', guestSessionId: 'g-mine', name: 'Me', whatsappNumber: '+8802' },
        'c2',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admin to access any conversation', async () => {
    const row = {
      id: 'c3',
      status: SupportConversationStatus.OPEN,
      userId: 'u9',
      guestSessionId: null,
      guestName: null,
      guestWhatsapp: null,
      assignedAdminId: null,
      subject: 'Support',
      lastMessageAt: null,
      lastMessagePreview: null,
      userUnreadCount: 0,
      adminUnreadCount: 2,
      closedAt: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'u9', name: 'Learner' },
    };
    prisma.supportConversation.findUnique.mockResolvedValue(row);

    const result = await service.requireAccessible(
      { kind: 'user', userId: 'admin1', role: UserRole.ADMIN, sessionId: 's-a' },
      'c3',
    );
    expect(result.id).toBe('c3');
  });

  it('returns not found for missing conversation', async () => {
    prisma.supportConversation.findUnique.mockResolvedValue(null);
    await expect(
      service.requireAccessible(
        { kind: 'user', userId: 'u1', role: UserRole.USER, sessionId: 's1' },
        'missing',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sums admin unread across open conversations', async () => {
    prisma.supportConversation.aggregate.mockResolvedValue({
      _sum: { adminUnreadCount: 5 },
    });
    const result = await service.unreadForActor({
      kind: 'user',
      userId: 'admin1',
      role: UserRole.ADMIN,
      sessionId: 's',
    });
    expect(result.unread).toBe(5);
  });
});
