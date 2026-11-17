import { HomepageContentStatus } from '@prisma/client';
import {
  HOMEPAGE_EDITABLE_PREVIEW_SLOTS,
  HOMEPAGE_OTHERS_TILE_ID,
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  createDefaultHomepagePayload,
  isHomepageOthersTile,
} from '@your-academy/shared';
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
    homepageRevision: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      deleteMany: jest.Mock;
    };
    mediaAsset: { findFirst: jest.Mock; findMany: jest.Mock };
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
    homepageRevision: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    mediaAsset: { findFirst: jest.fn(), findMany: jest.fn() },
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
    prisma.homepageContent.findUniqueOrThrow
      .mockResolvedValueOnce({
        status: HomepageContentStatus.DRAFT,
        payload: draftPayload,
        heroImageAssetId: null,
      })
      .mockResolvedValueOnce({
        status: HomepageContentStatus.PUBLISHED,
        payload: publishedPayload,
        heroImageAssetId: null,
      });
    prisma.homepageRevision.create.mockResolvedValue({ id: 'rev-1' });
    prisma.homepageRevision.findMany.mockResolvedValue([]);
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
    expect(prisma.homepageRevision.create).toHaveBeenCalled();
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

  it('enriches tile logo URLs from MediaAsset and strips logoUrl on draft save', async () => {
    const logoId = '11111111-1111-4111-8111-111111111111';
    const withLogo = createDefaultHomepagePayload();
    withLogo.categories.tiles[0] = {
      ...withLogo.categories.tiles[0]!,
      logoAssetId: logoId,
      logoUrl: 'https://client.example/should-strip.png',
    };

    const assetRow = {
      id: logoId,
      publicId: 'your-academy/homepage-tile-logo/admin/logo1',
      resourceType: 'IMAGE',
      deliveryType: 'UPLOAD',
      width: 512,
      height: 400,
    };
    prisma.mediaAsset.findMany
      .mockResolvedValueOnce([{ id: logoId }])
      .mockResolvedValueOnce([assetRow]);
    prisma.homepageContent.update.mockResolvedValue({
      id: 'draft-1',
      status: HomepageContentStatus.DRAFT,
      payload: withLogo,
      heroImageAssetId: null,
      publishedAt: null,
      updatedAt: new Date(),
      heroImage: null,
    });

    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
    const result = await service.updateDraft(user as never, { payload: withLogo });

    expect(prisma.mediaAsset.findMany).toHaveBeenCalled();
    const savedPayload = prisma.homepageContent.update.mock.calls[0]![0].data.payload as {
      categories: { tiles: Array<{ logoUrl?: string; logoAssetId?: string }> };
    };
    expect(savedPayload.categories.tiles[0]?.logoAssetId).toBe(logoId);
    expect(savedPayload.categories.tiles[0]?.logoUrl).toBeUndefined();
    expect(result.payload.categories.tiles[0]?.logoUrl).toContain(
      'res.cloudinary.com/demo-cloud/image/upload/c_fit,w_256,h_256',
    );
  });

  it('forces Others to fixed position 5 and rejects client reordering on draft save', async () => {
    const payload = createDefaultHomepagePayload();
    const others = payload.categories.tiles.find((t) => isHomepageOthersTile(t))!;
    const regular = payload.categories.tiles.filter((t) => !isHomepageOthersTile(t));
    // Malicious client: put Others first and duplicate it.
    payload.categories.tiles = [
      { ...others, id: 'others-dup', displayTitle: 'Others' },
      others,
      ...regular,
    ];

    prisma.mediaAsset.findMany.mockResolvedValue([]);
    prisma.homepageContent.update.mockResolvedValue({
      id: 'draft-1',
      status: HomepageContentStatus.DRAFT,
      payload,
      heroImageAssetId: null,
      publishedAt: null,
      updatedAt: new Date(),
      heroImage: null,
    });

    await service.updateDraft(user as never, { payload });

    const savedPayload = prisma.homepageContent.update.mock.calls[0]![0].data.payload as {
      categories: { tiles: Array<{ id: string; displayTitle: string; visible: boolean }> };
      topics: { tiles: Array<{ id: string; displayTitle: string; visible: boolean }> };
    };

    const catTiles = savedPayload.categories.tiles;
    const othersIndex = catTiles.findIndex((t) => t.id === HOMEPAGE_OTHERS_TILE_ID);
    expect(othersIndex).toBe(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    expect(othersIndex).toBe(HOMEPAGE_SECTION_PREVIEW_LIMIT - 1);
    expect(catTiles.filter((t) => t.id === HOMEPAGE_OTHERS_TILE_ID)).toHaveLength(1);
    expect(catTiles[othersIndex]?.visible).toBe(true);

    const topicOthersIndex = savedPayload.topics.tiles.findIndex(
      (t) => t.id === HOMEPAGE_OTHERS_TILE_ID,
    );
    expect(topicOthersIndex).toBe(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
  });
});
