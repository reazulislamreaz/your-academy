import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HomepageContentStatus, Prisma } from '@prisma/client';
import {
  createDefaultHomepagePayload,
  createErrorResponse,
  homepagePayloadSchema,
  normalizeHomepagePayload,
  type HomepagePayload,
} from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

export type HomepagePublicView = {
  payload: HomepagePayload;
  heroImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type HomepageAdminView = {
  draft: HomepagePublicView & { id: string; heroImageAssetId: string | null };
  published: HomepagePublicView & { id: string; heroImageAssetId: string | null };
};

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);
  private publicCache: { at: number; view: HomepagePublicView } | null = null;
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async getPublishedPublic(): Promise<HomepagePublicView> {
    const now = Date.now();
    if (this.publicCache && now - this.publicCache.at < HomepageService.CACHE_TTL_MS) {
      return this.publicCache.view;
    }
    await this.ensureRows();
    const row = await this.prisma.homepageContent.findUnique({
      where: { status: HomepageContentStatus.PUBLISHED },
      include: { heroImage: true },
    });
    if (!row) {
      throw new NotFoundException(
        createErrorResponse('HOMEPAGE_NOT_FOUND', 'Published homepage missing', newRequestId()),
      );
    }
    const view = await this.toView(row);
    this.publicCache = { at: now, view };
    return view;
  }

  async getAdmin(): Promise<HomepageAdminView> {
    await this.ensureRows();
    const [draft, published] = await Promise.all([
      this.prisma.homepageContent.findUnique({
        where: { status: HomepageContentStatus.DRAFT },
        include: { heroImage: true },
      }),
      this.prisma.homepageContent.findUnique({
        where: { status: HomepageContentStatus.PUBLISHED },
        include: { heroImage: true },
      }),
    ]);
    if (!draft || !published) {
      throw new NotFoundException(
        createErrorResponse('HOMEPAGE_NOT_FOUND', 'Homepage rows missing', newRequestId()),
      );
    }
    const [draftView, publishedView] = await Promise.all([
      this.toView(draft),
      this.toView(published),
    ]);
    return {
      draft: { id: draft.id, heroImageAssetId: draft.heroImageAssetId, ...draftView },
      published: {
        id: published.id,
        heroImageAssetId: published.heroImageAssetId,
        ...publishedView,
      },
    };
  }

  async updateDraft(
    user: RequestUser,
    input: { payload: unknown; heroImageAssetId?: string | null },
  ) {
    await this.ensureRows();
    const payload = this.parsePayloadForPersist(input.payload);
    await this.assertTileLogoAssets(payload);
    const heroImageAssetId =
      input.heroImageAssetId === undefined ? undefined : input.heroImageAssetId;

    if (heroImageAssetId) {
      const asset = await this.prisma.mediaAsset.findFirst({
        where: { id: heroImageAssetId, deletedAt: null },
      });
      if (!asset) {
        throw new BadRequestException(
          createErrorResponse('MEDIA_NOT_FOUND', 'Hero image asset not found', newRequestId()),
        );
      }
    }

    const updated = await this.prisma.homepageContent.update({
      where: { status: HomepageContentStatus.DRAFT },
      data: {
        payload: payload as unknown as Prisma.InputJsonValue,
        updatedById: user.userId,
        ...(heroImageAssetId !== undefined ? { heroImageAssetId } : {}),
      },
      include: { heroImage: true },
    });

    return {
      id: updated.id,
      heroImageAssetId: updated.heroImageAssetId,
      ...(await this.toView(updated)),
    };
  }

  async publish(user: RequestUser) {
    await this.ensureRows();
    const draft = await this.prisma.homepageContent.findUniqueOrThrow({
      where: { status: HomepageContentStatus.DRAFT },
    });
    const previous = await this.prisma.homepageContent.findUniqueOrThrow({
      where: { status: HomepageContentStatus.PUBLISHED },
    });
    const payload = this.parsePayloadForPersist(draft.payload);
    const now = new Date();

    // Snapshot the previously published homepage before overwriting.
    await this.prisma.homepageRevision.create({
      data: {
        payload: previous.payload as Prisma.InputJsonValue,
        heroImageAssetId: previous.heroImageAssetId,
        note: 'Auto-saved before publish',
        createdById: user.userId,
      },
    });
    await this.pruneRevisions();

    const published = await this.prisma.homepageContent.update({
      where: { status: HomepageContentStatus.PUBLISHED },
      data: {
        payload: payload as unknown as Prisma.InputJsonValue,
        heroImageAssetId: draft.heroImageAssetId,
        publishedAt: now,
        updatedById: user.userId,
      },
      include: { heroImage: true },
    });

    this.invalidatePublicCache();
    this.logger.log(`Homepage published by ${user.userId}`);
    return {
      id: published.id,
      heroImageAssetId: published.heroImageAssetId,
      ...(await this.toView(published)),
    };
  }

  async listRevisions(limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.prisma.homepageRevision.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        note: true,
        createdAt: true,
        createdById: true,
        heroImageAssetId: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      createdById: r.createdById,
      heroImageAssetId: r.heroImageAssetId,
    }));
  }

  /** Copy a revision into the draft (does not publish). */
  async restoreRevision(user: RequestUser, revisionId: string) {
    const revision = await this.prisma.homepageRevision.findUnique({
      where: { id: revisionId },
    });
    if (!revision) {
      throw new NotFoundException(
        createErrorResponse('REVISION_NOT_FOUND', 'Homepage revision not found', newRequestId()),
      );
    }
    const payload = this.parsePayloadForPersist(revision.payload);
    const draft = await this.prisma.homepageContent.update({
      where: { status: HomepageContentStatus.DRAFT },
      data: {
        payload: payload as unknown as Prisma.InputJsonValue,
        heroImageAssetId: revision.heroImageAssetId,
        updatedById: user.userId,
      },
      include: { heroImage: true },
    });
    return {
      id: draft.id,
      heroImageAssetId: draft.heroImageAssetId,
      ...(await this.toView(draft)),
    };
  }

  private async pruneRevisions(keep = 20) {
    const old = await this.prisma.homepageRevision.findMany({
      orderBy: { createdAt: 'desc' },
      skip: keep,
      select: { id: true },
    });
    if (old.length === 0) return;
    await this.prisma.homepageRevision.deleteMany({
      where: { id: { in: old.map((r) => r.id) } },
    });
  }

  async restore(user: RequestUser) {
    await this.ensureRows();
    const published = await this.prisma.homepageContent.findUniqueOrThrow({
      where: { status: HomepageContentStatus.PUBLISHED },
    });
    const payload = this.parsePayloadForPersist(published.payload);

    const draft = await this.prisma.homepageContent.update({
      where: { status: HomepageContentStatus.DRAFT },
      data: {
        payload: payload as unknown as Prisma.InputJsonValue,
        heroImageAssetId: published.heroImageAssetId,
        updatedById: user.userId,
      },
      include: { heroImage: true },
    });

    return {
      id: draft.id,
      heroImageAssetId: draft.heroImageAssetId,
      ...(await this.toView(draft)),
    };
  }

  invalidatePublicCache() {
    this.publicCache = null;
  }

  private parsePayload(raw: unknown): HomepagePayload {
    const parsed = homepagePayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_HOMEPAGE_PAYLOAD',
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 500),
          newRequestId(),
        ),
      );
    }
    return parsed.data;
  }

  /** Persist without resolved delivery URLs (those are read-only enrichments). */
  private parsePayloadForPersist(raw: unknown): HomepagePayload {
    const payload = normalizeHomepagePayload(this.parsePayload(raw));
    const stripLogoUrl = <
      T extends {
        logoUrl?: string | null;
        logoWidth?: number | null;
        logoHeight?: number | null;
      },
    >(
      t: T,
    ) => ({
      ...t,
      logoUrl: undefined,
      logoWidth: t.logoWidth ?? undefined,
      logoHeight: t.logoHeight ?? undefined,
    });
    return {
      ...payload,
      categories: {
        ...payload.categories,
        tiles: payload.categories.tiles.map(stripLogoUrl),
      },
      writtenCategories: {
        ...payload.writtenCategories,
        tiles: payload.writtenCategories.tiles.map(stripLogoUrl),
      },
      topics: {
        ...payload.topics,
        tiles: payload.topics.tiles.map(stripLogoUrl),
      },
    };
  }

  private async assertTileLogoAssets(payload: HomepagePayload) {
    const ids = [
      ...payload.categories.tiles.map((t) => t.logoAssetId),
      ...payload.writtenCategories.tiles.map((t) => t.logoAssetId),
      ...payload.topics.tiles.map((t) => t.logoAssetId),
    ].filter((id): id is string => Boolean(id));
    if (!ids.length) return;
    const unique = [...new Set(ids)];
    const found = await this.prisma.mediaAsset.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new BadRequestException(
        createErrorResponse(
          'MEDIA_NOT_FOUND',
          'One or more tile logo assets were not found',
          newRequestId(),
        ),
      );
    }
  }

  private async toView(row: {
    payload: Prisma.JsonValue;
    publishedAt: Date | null;
    updatedAt: Date;
    heroImage: { publicId: string; resourceType: string; deliveryType: string } | null;
  }): Promise<HomepagePublicView> {
    const payload = await this.enrichTileLogos(
      normalizeHomepagePayload(this.parsePayload(row.payload)),
    );
    return {
      payload,
      heroImageUrl: this.resolveHeroUrl(row.heroImage),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async enrichTileLogos(payload: HomepagePayload): Promise<HomepagePayload> {
    const ids = [
      ...payload.categories.tiles.map((t) => t.logoAssetId),
      ...payload.writtenCategories.tiles.map((t) => t.logoAssetId),
      ...payload.topics.tiles.map((t) => t.logoAssetId),
    ].filter((id): id is string => Boolean(id));
    if (!ids.length) return payload;

    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: [...new Set(ids)] }, deletedAt: null },
      select: {
        id: true,
        publicId: true,
        resourceType: true,
        deliveryType: true,
        width: true,
        height: true,
      },
    });
    const byId = new Map(assets.map((a) => [a.id, a]));

    const mapTile = <T extends { logoAssetId?: string | null }>(tile: T) => {
      const asset = tile.logoAssetId ? byId.get(tile.logoAssetId) : null;
      if (!asset) {
        return { ...tile, logoUrl: null as string | null };
      }
      return {
        ...tile,
        logoUrl: this.resolveTileLogoUrl(asset),
        logoWidth: asset.width ?? null,
        logoHeight: asset.height ?? null,
      };
    };

    return {
      ...payload,
      categories: {
        ...payload.categories,
        tiles: payload.categories.tiles.map(mapTile),
      },
      writtenCategories: {
        ...payload.writtenCategories,
        tiles: payload.writtenCategories.tiles.map(mapTile),
      },
      topics: {
        ...payload.topics,
        tiles: payload.topics.tiles.map(mapTile),
      },
    };
  }

  private resolveHeroUrl(
    asset: { publicId: string; resourceType: string; deliveryType: string } | null,
  ): string | null {
    if (!asset) return null;
    const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    if (!cloud || cloud === 'demo') return null;
    const resource = asset.resourceType === 'RAW' ? 'raw' : 'image';
    const type =
      asset.deliveryType === 'AUTHENTICATED'
        ? 'authenticated'
        : asset.deliveryType === 'PRIVATE'
          ? 'private'
          : 'upload';
    // Public homepage hero uses upload delivery; signed URLs not required.
    // Serve a sized, auto-format transform so browsers never download the raw upload.
    if (type !== 'upload') return null;
    if (resource === 'raw') {
      return `https://res.cloudinary.com/${cloud}/raw/upload/${asset.publicId}`;
    }
    return `https://res.cloudinary.com/${cloud}/image/upload/c_fill,w_880,h_924,q_auto:good,f_auto/${asset.publicId}`;
  }

  /** Public delivery with fit transform so oversized logos stay crisp at 256px. */
  private resolveTileLogoUrl(asset: {
    publicId: string;
    resourceType: string;
    deliveryType: string;
  }): string | null {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    if (!cloud || cloud === 'demo') return null;
    if (asset.resourceType === 'RAW' || asset.deliveryType !== 'UPLOAD') return null;
    // Tiles render ~28×28 CSS px — 64px source is enough for 2× retina.
    return `https://res.cloudinary.com/${cloud}/image/upload/c_fit,w_64,h_64,q_auto:good,f_auto/${asset.publicId}`;
  }

  /** Idempotent seed of DRAFT + PUBLISHED with default marketing copy. */
  private async ensureRows() {
    const count = await this.prisma.homepageContent.count();
    if (count >= 2) return;

    const payload = createDefaultHomepagePayload() as unknown as Prisma.InputJsonValue;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.homepageContent.findMany({ select: { status: true } });
      const have = new Set(existing.map((r) => r.status));
      if (!have.has(HomepageContentStatus.DRAFT)) {
        await tx.homepageContent.create({
          data: {
            status: HomepageContentStatus.DRAFT,
            payload,
          },
        });
      }
      if (!have.has(HomepageContentStatus.PUBLISHED)) {
        await tx.homepageContent.create({
          data: {
            status: HomepageContentStatus.PUBLISHED,
            payload,
            publishedAt: now,
          },
        });
      }
    });
  }
}
