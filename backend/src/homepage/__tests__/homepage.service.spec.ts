import { HomepageContentStatus } from '@prisma/client';
import { createDefaultHomepagePayload } from '@your-academy/shared';
import { HomepageService } from '../homepage.service';

describe('HomepageService', () => {
  const draftPayload = createDefaultHomepagePayload();
  const publishedPayload = {
    ...createDefaultHomepagePayload(),
    hero: { ...createDefaultHomepagePayload().hero, titleHighlight: 'Live!' },
  };

  type PrismaMock = {
    homepageContent: {
      count: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    mediaAsset: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const prisma: PrismaMock = {
    homepageContent: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mediaAsset: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (fn: (tx: PrismaMock) => Promise<unknown>) => fn(prisma),
  );

  const user = { userId: 'admin-1', role: 'ADMIN' as const };
  let service: HomepageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HomepageService(prisma as never);
    prisma.homepageContent.count.mockResolvedValue(2);
  });

  it('publish copies draft payload onto published and invalidates cache', async () => {
    prisma.homepageContent.findUniqueOrThrow.mockResolvedValue({
      status: HomepageContentStatus.DRAFT,
      payload: draftPayload,
      heroImageAssetId: null,
    });
    prisma.homepageContent.update.mockResolvedValue({
      id: 'pub-1',
      status: HomepageContentStatus.PUBLISHED,
      payload: draftPayload,
      heroImageAssetId: null,
      publishedAt: new Date('2026-11-14T00:00:00Z'),
      updatedAt: new Date('2026-11-14T00:00:00Z'),
      heroImage: null,
    });

    const result = await service.publish(user as never);
    expect(result.payload.hero.titleHighlight).toBe('');
    expect(prisma.homepageContent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: HomepageContentStatus.PUBLISHED },
      }),
    );
  });

  it('restore copies published payload back into draft', async () => {
    prisma.homepageContent.findUniqueOrThrow.mockResolvedValue({
      status: HomepageContentStatus.PUBLISHED,
      payload: publishedPayload,
      heroImageAssetId: 'img-1',
    });
    prisma.homepageContent.update.mockResolvedValue({
      id: 'draft-1',
      status: HomepageContentStatus.DRAFT,
      payload: publishedPayload,
      heroImageAssetId: 'img-1',
      publishedAt: null,
      updatedAt: new Date(),
      heroImage: null,
    });

    const result = await service.restore(user as never);
    expect(result.payload.hero.titleHighlight).toBe('Live!');
    expect(prisma.homepageContent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: HomepageContentStatus.DRAFT },
        data: expect.objectContaining({ heroImageAssetId: 'img-1' }),
      }),
    );
  });
});
