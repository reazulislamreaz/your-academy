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
import { PrismaService } from '../database/prisma.service';
import { MaintenanceQueueService } from '../queue/maintenance-queue.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import { StorageService } from '../storage/storage.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly access: AccessControlService,
    private readonly maintenanceQueue: MaintenanceQueueService,
    private readonly audit: AuditService,
  ) {}

  async listPublished(
    user: RequestUser,
    params: { cursor?: string; limit?: number; categoryId?: string },
  ) {
    const limit = Math.min(params.limit ?? 20, 100);
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
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async adminList() {
    return this.prisma.document.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }],
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
  }

  async getPublished(id: string, user: RequestUser) {
    const doc = await this.prisma.document.findFirst({
      where: { id, isPublished: true, deletedAt: null },
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

    return {
      ...doc,
      bookmarked: Boolean(bookmark),
      download: await this.resolveDownload(doc.mediaAsset.id),
    };
  }

  private async resolveDownload(mediaAssetId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset || asset.deletedAt) {
      return { available: false, reason: 'ASSET_MISSING', url: null as string | null };
    }
    if (asset.publicId.startsWith('seed/') || asset.publicId.startsWith('admin-placeholder/')) {
      return {
        available: false,
        reason: this.storage.isConfigured() ? 'PLACEHOLDER_ASSET' : 'STORAGE_NOT_CONFIGURED',
        url: null as string | null,
      };
    }
    const signed = await this.storage.generateSignedDownloadUrl(asset.publicId, {
      resourceType: asset.resourceType === MediaResourceType.RAW ? 'raw' : 'image',
      deliveryType: asset.deliveryType,
      ttlSeconds: 180,
    });
    if (!signed) {
      return { available: false, reason: 'STORAGE_NOT_CONFIGURED', url: null as string | null };
    }
    return { available: true, reason: 'OK', url: signed };
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
          visibility: dto.visibility ?? DocumentVisibility.AUTHENTICATED,
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
          visibility: dto.visibility ?? DocumentVisibility.AUTHENTICATED,
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

  async update(id: string, dto: UpdateDocumentDto) {
    await this.adminGet(id);
    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        mediaAsset: {
          select: { originalFilename: true, mimeType: true, bytes: true },
        },
      },
    });
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
