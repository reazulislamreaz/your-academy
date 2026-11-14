import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentVisibility, MediaResourceType, UserRole } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { AuditService } from '../audit/audit.service';
import { paginateById, parseLimit } from '../common/pagination';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { MaintenanceQueueService } from '../queue/maintenance-queue.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import { StorageService } from '../storage/storage.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';
import { publicPdfByteCache } from './pdf-byte-cache';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessControlService,
    private readonly maintenanceQueue: MaintenanceQueueService,
    private readonly audit: AuditService,
    private readonly learningActivity: LearningActivityService,
  ) {}

  /**
   * Guest-facing library for পত্রিকার গুরুত্বপূর্ণ কলাম — published PUBLIC docs only.
   */
  async listPublicPublished(params: { cursor?: string; limit?: number; q?: string } = {}) {
    const limit = parseLimit(params.limit, 20);
    const q = params.q?.trim();
    const items = await this.prisma.document.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        visibility: DocumentVisibility.PUBLIC,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        visibility: true,
        category: { select: { id: true, name: true } },
        mediaAsset: {
          select: { originalFilename: true, mimeType: true, bytes: true },
        },
        updatedAt: true,
        createdAt: true,
      },
    });
    return paginateById(items, limit);
  }

  async getPublicPublished(id: string) {
    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        isPublished: true,
        deletedAt: null,
        visibility: DocumentVisibility.PUBLIC,
      },
      select: {
        id: true,
        title: true,
        description: true,
        visibility: true,
        category: { select: { id: true, name: true } },
        mediaAsset: {
          select: {
            id: true,
            mimeType: true,
            bytes: true,
            originalFilename: true,
            format: true,
          },
        },
        updatedAt: true,
        createdAt: true,
      },
    });
    if (!doc) {
      throw new NotFoundException(
        createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', newRequestId()),
      );
    }
    const view = await this.resolveViewAvailability(doc.mediaAsset.id);
    // Warm cache while the client mounts the viewer (Cloudinary can be slow).
    if (view.available) {
      void this.warmPublicPdfCache(id);
    }
    return {
      ...doc,
      /** In-app viewer only — never expose storage URLs to the client. */
      view,
    };
  }

  /**
   * Proxy bytes for the public PDF viewer.
   * Caller sets Content-Disposition: inline (no attachment / download UI).
   */
  async getPublicPdfBytes(id: string): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    const cached = publicPdfByteCache.get(`public:${id}`);
    if (cached) {
      return {
        buffer: cached.buffer,
        contentType: cached.contentType,
        filename: cached.filename,
      };
    }

    const doc = await this.prisma.document.findFirst({
      where: {
        id,
        isPublished: true,
        deletedAt: null,
        visibility: DocumentVisibility.PUBLIC,
      },
      select: {
        mediaAsset: {
          select: {
            id: true,
            publicId: true,
            mimeType: true,
            originalFilename: true,
            resourceType: true,
            deliveryType: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!doc?.mediaAsset || doc.mediaAsset.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', newRequestId()),
      );
    }
    const payload = await this.fetchPdfPayload(doc.mediaAsset);
    publicPdfByteCache.set(`public:${id}`, payload);
    return payload;
  }

  /**
   * Authenticated in-app viewer bytes — same inline delivery, no signed download URL.
   */
  async getAuthenticatedPdfBytes(
    id: string,
    user: RequestUser,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const cacheKey = `auth:${id}`;
    const cached = publicPdfByteCache.get(cacheKey);
    if (cached) {
      return {
        buffer: cached.buffer,
        contentType: cached.contentType,
        filename: cached.filename,
      };
    }

    const doc = await this.prisma.document.findFirst({
      where: { id, isPublished: true, deletedAt: null },
      select: {
        visibility: true,
        mediaAsset: {
          select: {
            id: true,
            publicId: true,
            mimeType: true,
            originalFilename: true,
            resourceType: true,
            deliveryType: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!doc?.mediaAsset || doc.mediaAsset.deletedAt) {
      throw new NotFoundException(
        createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', newRequestId()),
      );
    }

    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const allowed = await this.access.canAccessDocument(dbUser, doc.visibility);
    if (!allowed) {
      throw new ForbiddenException(
        createErrorResponse(
          'DOCUMENT_PREMIUM_REQUIRED',
          'This document requires an active trial or subscription',
          newRequestId(),
        ),
      );
    }

    const payload = await this.fetchPdfPayload(doc.mediaAsset);
    publicPdfByteCache.set(cacheKey, payload);
    if (doc.visibility === DocumentVisibility.PUBLIC) {
      publicPdfByteCache.set(`public:${id}`, payload);
    }
    return payload;
  }

  private async warmPublicPdfCache(id: string): Promise<void> {
    try {
      if (publicPdfByteCache.get(`public:${id}`)) return;
      await this.getPublicPdfBytes(id);
    } catch {
      /* warm is best-effort */
    }
  }

  private async fetchPdfPayload(asset: {
    publicId: string;
    mimeType: string;
    originalFilename: string | null;
    resourceType: MediaResourceType;
    deliveryType: import('@prisma/client').MediaDeliveryType;
  }): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    if (asset.publicId.startsWith('seed/') || asset.publicId.startsWith('admin-placeholder/')) {
      throw new NotFoundException(
        createErrorResponse(
          'DOCUMENT_FILE_UNAVAILABLE',
          'PDF file is not available',
          newRequestId(),
        ),
      );
    }
    const fetched = await this.storage.fetchAssetBytes(asset.publicId, {
      resourceType: asset.resourceType === MediaResourceType.RAW ? 'raw' : 'image',
      deliveryType: asset.deliveryType,
      ttlSeconds: 120,
      timeoutMs: 90_000,
    });
    if (!fetched) {
      throw new NotFoundException(
        createErrorResponse(
          'DOCUMENT_FILE_UNAVAILABLE',
          'PDF file is not available',
          newRequestId(),
        ),
      );
    }
    return {
      buffer: fetched.buffer,
      contentType: asset.mimeType || fetched.contentType || 'application/pdf',
      filename: asset.originalFilename?.replace(/[^\w.\-()+ ]+/g, '_') || 'document.pdf',
    };
  }

  private async resolveViewAvailability(mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset || asset.deletedAt) {
      return { available: false, reason: 'ASSET_MISSING' as const };
    }
    if (asset.publicId.startsWith('seed/') || asset.publicId.startsWith('admin-placeholder/')) {
      return {
        available: false,
        reason: (this.storage.isConfigured()
          ? 'PLACEHOLDER_ASSET'
          : 'STORAGE_NOT_CONFIGURED') as 'PLACEHOLDER_ASSET' | 'STORAGE_NOT_CONFIGURED',
      };
    }
    if (!this.storage.isConfigured()) {
      return { available: false, reason: 'STORAGE_NOT_CONFIGURED' as const };
    }
    return { available: true, reason: 'OK' as const };
  }

  async listPublished(
    user: RequestUser,
    params: { cursor?: string; limit?: number; categoryId?: string },
  ) {
    const limit = parseLimit(params.limit, 20);
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const allowPremium =
      dbUser.role === UserRole.ADMIN ||
      (await this.access.canAccessDocument(dbUser, DocumentVisibility.PREMIUM));

    const items = await this.prisma.document.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        visibility: allowPremium
          ? undefined
          : { in: [DocumentVisibility.PUBLIC, DocumentVisibility.AUTHENTICATED] },
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        visibility: true,
        category: { select: { id: true, name: true } },
        updatedAt: true,
      },
    });
    return paginateById(items, limit);
  }

  async adminList(params: { cursor?: string; limit?: number } = {}) {
    const limit = parseLimit(params.limit, 50);
    const rows = await this.prisma.document.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        description: true,
        visibility: true,
        isPublished: true,
        category: { select: { id: true, name: true } },
        mediaAsset: {
          select: { originalFilename: true, mimeType: true, bytes: true },
        },
        updatedAt: true,
      },
    });
    return paginateById(rows, limit);
  }

  async getPublished(id: string, user: RequestUser) {
    const doc = await this.prisma.document.findFirst({
      where: { id, isPublished: true, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        visibility: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
        mediaAsset: {
          select: {
            id: true,
            mimeType: true,
            bytes: true,
            originalFilename: true,
            format: true,
          },
        },
        updatedAt: true,
      },
    });
    if (!doc) {
      throw new NotFoundException(
        createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', newRequestId()),
      );
    }

    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const allowed = await this.access.canAccessDocument(dbUser, doc.visibility);
    if (!allowed) {
      throw new ForbiddenException(
        createErrorResponse(
          'DOCUMENT_PREMIUM_REQUIRED',
          'This document requires an active trial or subscription',
          newRequestId(),
        ),
      );
    }

    const bookmark = await this.prisma.documentBookmark.findUnique({
      where: {
        userId_documentId: { userId: user.userId, documentId: id },
      },
      select: { id: true },
    });

    await this.learningActivity.record({
      userId: user.userId,
      type: 'DOCUMENT_VIEW',
      subjectCategoryId: doc.categoryId,
      meta: { documentId: doc.id },
    });

    const view = await this.resolveViewAvailability(doc.mediaAsset.id);
    // Never return Cloudinary/signed download URLs to learners (DEC-033).
    return {
      ...doc,
      bookmarked: Boolean(bookmark),
      view,
      download: {
        available: false,
        reason: 'VIEW_ONLY' as const,
        url: null as string | null,
      },
    };
  }

  async adminGet(id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
        mediaAsset: {
          select: {
            id: true,
            mimeType: true,
            bytes: true,
            originalFilename: true,
            format: true,
          },
        },
      },
    });
    if (!doc) {
      throw new NotFoundException(
        createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', newRequestId()),
      );
    }
    return doc;
  }

  async create(user: RequestUser, dto: CreateDocumentDto) {
    if (dto.mediaAssetId) {
      const media = await this.prisma.mediaAsset.findFirst({
        where: { id: dto.mediaAssetId, deletedAt: null, uploadedById: user.userId },
      });
      if (!media) {
        throw new NotFoundException(
          createErrorResponse('MEDIA_NOT_FOUND', 'Media asset not found', newRequestId()),
        );
      }
      return this.prisma.document.create({
        data: {
          title: dto.title.trim(),
          description: dto.description,
          categoryId: dto.categoryId,
          visibility: dto.visibility ?? DocumentVisibility.PUBLIC,
          isPublished: dto.isPublished ?? false,
          mediaAssetId: media.id,
          createdById: user.userId,
        },
        include: {
          category: { select: { id: true, name: true } },
          mediaAsset: {
            select: { originalFilename: true, mimeType: true, bytes: true },
          },
        },
      });
    }

    const filename =
      dto.filename?.trim() || `${dto.title.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`;
    const publicId = `admin-placeholder/${user.userId}/${Date.now()}-${filename}`;

    return this.prisma.$transaction(async (tx) => {
      const media = await tx.mediaAsset.create({
        data: {
          publicId,
          resourceType: 'RAW',
          deliveryType: 'UPLOAD',
          format: 'pdf',
          bytes: 0,
          mimeType: 'application/pdf',
          originalFilename: filename,
          uploadedById: user.userId,
        },
      });

      return tx.document.create({
        data: {
          title: dto.title.trim(),
          description: dto.description,
          categoryId: dto.categoryId,
          visibility: dto.visibility ?? DocumentVisibility.PUBLIC,
          isPublished: dto.isPublished ?? false,
          mediaAssetId: media.id,
          createdById: user.userId,
        },
        include: {
          category: { select: { id: true, name: true } },
          mediaAsset: {
            select: { originalFilename: true, mimeType: true, bytes: true },
          },
        },
      });
    });
  }

  async update(id: string, dto: UpdateDocumentDto, actor?: RequestUser) {
    const existing = await this.adminGet(id);
    let nextMediaAssetId: string | undefined;

    if (dto.mediaAssetId) {
      if (!actor) {
        throw new ForbiddenException(
          createErrorResponse('FORBIDDEN', 'Actor required to replace media', newRequestId()),
        );
      }
      const media = await this.prisma.mediaAsset.findFirst({
        where: { id: dto.mediaAssetId, deletedAt: null, uploadedById: actor.userId },
      });
      if (!media) {
        throw new NotFoundException(
          createErrorResponse('MEDIA_NOT_FOUND', 'Media asset not found', newRequestId()),
        );
      }
      nextMediaAssetId = media.id;
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(nextMediaAssetId ? { mediaAssetId: nextMediaAssetId } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        mediaAsset: {
          select: { originalFilename: true, mimeType: true, bytes: true },
        },
      },
    });

    publicPdfByteCache.invalidateDocument(id);

    // Soft-delete previous Cloudinary asset after a successful replace.
    if (nextMediaAssetId && existing.mediaAssetId && existing.mediaAssetId !== nextMediaAssetId) {
      const oldAsset = await this.prisma.mediaAsset.findUnique({
        where: { id: existing.mediaAssetId },
      });
      if (oldAsset && !oldAsset.deletedAt) {
        await this.maintenanceQueue.enqueueDeleteAsset({
          mediaAssetId: oldAsset.id,
          publicId: oldAsset.publicId,
          resourceType: oldAsset.resourceType === MediaResourceType.RAW ? 'raw' : 'image',
        });
      }
    }

    return updated;
  }

  async softDelete(id: string, actorUserId?: string) {
    await this.adminGet(id);
    const doc = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
      include: {
        mediaAsset: { select: { id: true, publicId: true, resourceType: true, deletedAt: true } },
      },
    });

    publicPdfByteCache.invalidateDocument(id);

    if (doc.mediaAsset && !doc.mediaAsset.deletedAt) {
      await this.maintenanceQueue.enqueueDeleteAsset({
        mediaAssetId: doc.mediaAsset.id,
        publicId: doc.mediaAsset.publicId,
        resourceType: doc.mediaAsset.resourceType === MediaResourceType.RAW ? 'raw' : 'image',
      });
    }

    await this.audit.record({
      actorUserId,
      action: 'DOCUMENT_SOFT_DELETE',
      entityType: 'document',
      entityId: id,
    });

    return doc;
  }
}
