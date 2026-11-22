import { HomepageContentStatus } from '@prisma/client';
import {
  HOMEPAGE_EDITABLE_PREVIEW_SLOTS,
  HOMEPAGE_OTHERS_TILE_ID,
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  createDefaultHomepagePayload,
  createDefaultOthersCategoryTile,
  demoteTileFromHomepageTop,
  isHomepageOthersTile,
  normalizeHomepageSectionTiles,
  promoteTileIntoHomepageTop,
  splitHomepageSectionTiles,
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
      'res.cloudinary.com/demo-cloud/image/upload/c_fit,w_64,h_64',
    );
  });

  it('preserves layout section visibility when section.visible hints disagree', async () => {
    const payload = createDefaultHomepagePayload();
    payload.layout.sections = payload.layout.sections.map((s) =>
      s.id === 'topics' ? { ...s, visible: false } : s,
    );
    // Stale section flag — normalize must keep layout as source of truth.
    payload.topics.visible = true;

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
      layout: { sections: Array<{ id: string; visible: boolean }> };
      topics: { visible: boolean };
    };
    expect(savedPayload.layout.sections.find((s) => s.id === 'topics')?.visible).toBe(false);
    expect(savedPayload.topics.visible).toBe(false);
  });

  it('forces a single visible Others tile and preserves Top/rest split on draft save', async () => {
    const payload = createDefaultHomepagePayload();
    const others = payload.categories.tiles.find((t) => isHomepageOthersTile(t))!;
    const regular = payload.categories.tiles.filter((t) => !isHomepageOthersTile(t));
    // Malicious client: duplicate Others and place it first (empty Top is allowed;
    // regulars stay in remaining — promote restores Top without inventing duplicates).
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
    expect(catTiles.filter((t) => t.id === HOMEPAGE_OTHERS_TILE_ID)).toHaveLength(1);
    expect(catTiles[othersIndex]?.visible).toBe(true);
    expect(othersIndex).toBe(0);
    expect(catTiles.slice(1).map((t) => t.id)).toEqual(regular.map((t) => t.id));

    // Happy path: Top 4 + Others at #5 when payload is well-formed.
    const wellFormed = createDefaultHomepagePayload();
    prisma.homepageContent.update.mockClear();
    prisma.homepageContent.update.mockResolvedValue({
      id: 'draft-1',
      status: HomepageContentStatus.DRAFT,
      payload: wellFormed,
      heroImageAssetId: null,
      publishedAt: null,
      updatedAt: new Date(),
      heroImage: null,
    });
    await service.updateDraft(user as never, { payload: wellFormed });
    const savedWell = prisma.homepageContent.update.mock.calls[0]![0].data.payload as {
      categories: { tiles: Array<{ id: string }> };
      topics: { tiles: Array<{ id: string }> };
    };
    expect(
      savedWell.categories.tiles.findIndex((t) => t.id === HOMEPAGE_OTHERS_TILE_ID),
    ).toBe(HOMEPAGE_EDITABLE_PREVIEW_SLOTS);
    // Topic Base public tiles come from TOPIC taxonomy; CMS defaults to Others only.
    expect(
      savedWell.topics.tiles.findIndex((t) => t.id === HOMEPAGE_OTHERS_TILE_ID),
    ).toBe(0);
    expect(HOMEPAGE_SECTION_PREVIEW_LIMIT).toBe(HOMEPAGE_EDITABLE_PREVIEW_SLOTS + 1);
  });
});

describe('homepage Top 4 tile helpers', () => {
  const others = () => createDefaultOthersCategoryTile('/question-bank-categories');

  function baseTiles() {
    return normalizeHomepageSectionTiles(createDefaultHomepagePayload().categories.tiles, others);
  }

  it('promotes into a full Top 4 and moves the previous #4 into remaining', () => {
    const tiles = [
      ...baseTiles(),
      {
        id: 'private-bank',
        displayTitle: 'Private Bank',
        subtitle: '',
        iconKey: 'bank' as const,
        categoryId: null,
        subcategoryId: null,
        fallbackHref: '/x',
        visible: true,
        logoAssetId: null,
        logoUrl: null,
      },
    ];
    const after = promoteTileIntoHomepageTop(tiles, 'private-bank', others, 1);
    const { top, others: o, rest } = splitHomepageSectionTiles(after);
    expect(o?.id).toBe(HOMEPAGE_OTHERS_TILE_ID);
    expect(top.map((t) => t.id)).toEqual(['bcs', 'private-bank', 'bank', 'gov']);
    expect(rest.map((t) => t.id)).toContain('ntrca');
    expect(rest.map((t) => t.id)).not.toContain('private-bank');
    expect(top).toHaveLength(4);
  });

  it('demotes a Top item into remaining without backfilling', () => {
    const after = demoteTileFromHomepageTop(baseTiles(), 'bank', others);
    const { top, rest } = splitHomepageSectionTiles(after);
    expect(top.map((t) => t.id)).toEqual(['bcs', 'gov', 'ntrca']);
    expect(rest.map((t) => t.id)).toEqual(['bank']);
  });
});
