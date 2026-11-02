import { UserRole, UserStatus } from '@prisma/client';
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

  it('grants answers during active trial', async () => {
    await expect(service.canViewAnswers(baseUser)).resolves.toBe(true);
  });

  it('denies answers after trial without subscription', async () => {
    const expired = {
      ...baseUser,
      trialEndsAt: new Date(Date.now() - 60_000),
    };
    await expect(service.canViewAnswers(expired)).resolves.toBe(false);
  });

  it('grants answers with active subscription after trial', async () => {
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
});
