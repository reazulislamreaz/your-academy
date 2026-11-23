import { DocumentVisibility, UserRole, UserStatus } from '@prisma/client';
import { Entitlement } from '@your-academy/shared';
import { AccessControlService } from '../access-control.service';

describe('AccessControlService', () => {
  const prisma = {
    userSubscription: {
      findFirst: jest.fn(),
    },
  };

  const service = new AccessControlService(prisma as never);

  const baseUser = {
    id: 'u1',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    trialStartedAt: new Date(Date.now() - 60_000),
    trialEndsAt: new Date(Date.now() + 60_000),
  };

  beforeEach(() => {
    prisma.userSubscription.findFirst.mockReset();
    prisma.userSubscription.findFirst.mockResolvedValue(null);
  });

  it('never grants answers from a trial window alone', async () => {
    await expect(service.canViewAnswers(baseUser)).resolves.toBe(false);
    expect(service.isTrialActive(baseUser)).toBe(false);
  });

  it('denies answers without subscription', async () => {
    const expired = {
      ...baseUser,
      trialEndsAt: new Date(Date.now() - 60_000),
    };
    await expect(service.canViewAnswers(expired)).resolves.toBe(false);
  });

  it('grants answers with active subscription', async () => {
    prisma.userSubscription.findFirst.mockResolvedValue({ id: 'sub1' });
    const expired = {
      ...baseUser,
      trialEndsAt: new Date(Date.now() - 60_000),
    };
    await expect(service.can(expired, Entitlement.VIEW_EXPLANATIONS)).resolves.toBe(true);
  });

  it('always grants admin manage content', async () => {
    await expect(
      service.can({ ...baseUser, role: UserRole.ADMIN }, Entitlement.MANAGE_CONTENT),
    ).resolves.toBe(true);
  });

  it('DEC-001: authenticated PDFs remain available without trial', async () => {
    const expired = {
      ...baseUser,
      trialEndsAt: new Date(Date.now() - 60_000),
    };
    await expect(
      service.canAccessDocument(expired, DocumentVisibility.AUTHENTICATED),
    ).resolves.toBe(true);
  });

  it('blocks PREMIUM PDFs without subscription', async () => {
    await expect(service.canAccessDocument(baseUser, DocumentVisibility.PREMIUM)).resolves.toBe(
      false,
    );
  });

  it('allows PREMIUM PDFs with active subscription', async () => {
    prisma.userSubscription.findFirst.mockResolvedValue({ id: 'sub1' });
    await expect(service.canAccessDocument(baseUser, DocumentVisibility.PREMIUM)).resolves.toBe(
      true,
    );
  });

  it('stripAnswerFields omits isCorrect and explanation when denied', () => {
    const stripped = service.stripAnswerFields(
      { isCorrect: true, explanation: 'secret', label: 'A' },
      false,
    );
    expect(stripped).toEqual({ label: 'A' });
    expect('isCorrect' in stripped).toBe(false);
    expect('explanation' in stripped).toBe(false);
  });
});

describe('AccessControlService.canViewerSeeAnswers (DEC-051)', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    userSubscription: { findFirst: jest.fn() },
  };
  const service = new AccessControlService(prisma as never);
  const user = {
    id: 'u1',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    trialStartedAt: new Date(),
    trialEndsAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.userSubscription.findFirst.mockResolvedValue(null);
  });

  it('is false for anonymous viewers without touching the database', async () => {
    await expect(service.canViewerSeeAnswers(null)).resolves.toBe(false);
    await expect(service.canViewerSeeAnswers(undefined)).resolves.toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('is false for free users and true with an active subscription', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.canViewerSeeAnswers({ userId: 'u1' })).resolves.toBe(false);
    prisma.userSubscription.findFirst.mockResolvedValue({ id: 'sub' });
    await expect(service.canViewerSeeAnswers({ userId: 'u1' })).resolves.toBe(true);
  });

  it('is true for admins', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: UserRole.ADMIN });
    await expect(service.canViewerSeeAnswers({ userId: 'u1' })).resolves.toBe(true);
  });

  it('is false for moderators without a subscription (answer bypass is Admin-only)', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, role: UserRole.MODERATOR });
    await expect(service.canViewerSeeAnswers({ userId: 'u1' })).resolves.toBe(false);
  });

  it('is false for suspended or deleted accounts', async () => {
    prisma.userSubscription.findFirst.mockResolvedValue({ id: 'sub' });
    prisma.user.findUnique.mockResolvedValue({ ...user, status: UserStatus.SUSPENDED });
    await expect(service.canViewerSeeAnswers({ userId: 'u1' })).resolves.toBe(false);
    prisma.user.findUnique.mockResolvedValue({ ...user, deletedAt: new Date() });
    await expect(service.canViewerSeeAnswers({ userId: 'u1' })).resolves.toBe(false);
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.canViewerSeeAnswers({ userId: 'u1' })).resolves.toBe(false);
  });
});
