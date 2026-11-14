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
    const view = this.toView(row);
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
    return {
      draft: { id: draft.id, heroImageAssetId: draft.heroImageAssetId, ...this.toView(draft) },
      published: {
        id: published.id,
        heroImageAssetId: published.heroImageAssetId,
        ...this.toView(published),
      },
    };
  }

  async updateDraft(
    user: RequestUser,
    input: { payload: unknown; heroImageAssetId?: string | null },
  ) {
    await this.ensureRows();
    const payload = this.parsePayload(input.payload);
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
      ...this.toView(updated),
    };
  }

  async publish(user: RequestUser) {
    await this.ensureRows();
    const draft = await this.prisma.homepageContent.findUniqueOrThrow({
      where: { status: HomepageContentStatus.DRAFT },
    });
    const payload = this.parsePayload(draft.payload);
    const now = new Date();

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
      ...this.toView(published),
    };
  }

  async restore(user: RequestUser) {
    await this.ensureRows();
    const published = await this.prisma.homepageContent.findUniqueOrThrow({
      where: { status: HomepageContentStatus.PUBLISHED },
    });
    const payload = this.parsePayload(published.payload);

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
      ...this.toView(draft),
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

  private toView(row: {
    payload: Prisma.JsonValue;
    publishedAt: Date | null;
    updatedAt: Date;
    heroImage: { publicId: string; resourceType: string; deliveryType: string } | null;
  }): HomepagePublicView {
    const payload = this.parsePayload(row.payload);
    return {
      payload,
      heroImageUrl: this.resolveHeroUrl(row.heroImage),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
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
    if (type !== 'upload') return null;
    return `https://res.cloudinary.com/${cloud}/${resource}/upload/${asset.publicId}`;
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
