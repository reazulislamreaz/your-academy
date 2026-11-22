import { ConflictException, NotFoundException } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { SocialLinksService } from '../social-links.service';

describe('SocialLinksService', () => {
  const prisma = {
    socialLink: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new SocialLinksService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listPublic returns only enabled links with URLs', async () => {
    prisma.socialLink.findMany.mockResolvedValue([
      {
        id: 'a',
        platform: SocialPlatform.FACEBOOK,
        label: '',
        url: 'https://facebook.com/ya',
        enabled: true,
        sortOrder: 0,
      },
      {
        id: 'b',
        platform: SocialPlatform.X,
        label: 'X',
        url: '   ',
        enabled: true,
        sortOrder: 1,
      },
    ]);

    const result = await service.listPublic();
    expect(result).toHaveLength(1);
    expect(result[0]?.platform).toBe('FACEBOOK');
    expect(result[0]?.label).toBe('Facebook');
  });

  it('create maps unique conflict to SOCIAL_LINK_EXISTS', async () => {
    prisma.socialLink.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
    prisma.socialLink.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({
        platform: SocialPlatform.FACEBOOK,
        url: 'https://facebook.com/ya',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('update throws when missing', async () => {
    prisma.socialLink.findUnique.mockResolvedValue(null);
    await expect(
      service.update('00000000-0000-4000-8000-000000000001', {
        enabled: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
