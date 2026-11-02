import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentVisibility } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import type { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(params: { cursor?: string; limit?: number; categoryId?: string }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const items = await this.prisma.document.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
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

  async getPublished(id: string) {
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

    return {
      ...doc,
      download: {
        available: false,
        reason: 'STORAGE_NOT_CONFIGURED',
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
    const filename = dto.filename?.trim() || `${dto.title.trim().toLowerCase().replace(/\s+/g, '-')}.pdf`;
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

  async softDelete(id: string) {
    await this.adminGet(id);
    return this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });
  }
}
