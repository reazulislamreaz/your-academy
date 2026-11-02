import { Injectable, NotFoundException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

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

    // Signed download arrives with real Cloudinary wiring (Phase 6 closeout).
    return {
      ...doc,
      download: {
        available: false,
        reason: 'STORAGE_NOT_CONFIGURED',
        url: null as string | null,
      },
    };
  }
}
