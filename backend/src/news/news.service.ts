import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import type { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';

const linkedDocumentSelect = {
  id: true,
  title: true,
  description: true,
  visibility: true,
  isPublished: true,
} as const;

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listPublished() {
    return this.prisma.news.findMany({
      where: { isPublished: true, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        publishedAt: true,
      },
    });
  }

  adminList() {
    return this.prisma.news.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        isPublished: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  async adminGet(id: string) {
    const article = await this.prisma.news.findFirst({
      where: { id, deletedAt: null },
      include: {
        documents: {
          include: {
            document: { select: linkedDocumentSelect },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!article) {
      throw new NotFoundException(
        createErrorResponse('NEWS_NOT_FOUND', 'Article not found', newRequestId()),
      );
    }
    return {
      ...article,
      documentIds: article.documents.map((row) => row.documentId),
      documents: article.documents.map((row) => row.document),
    };
  }

  async getBySlug(slug: string) {
    const article = await this.prisma.news.findFirst({
      where: { slug, isPublished: true, deletedAt: null },
      include: {
        documents: {
          where: {
            document: { isPublished: true, deletedAt: null },
          },
          include: {
            document: {
              select: {
                id: true,
                title: true,
                description: true,
                visibility: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!article) {
      throw new NotFoundException(
        createErrorResponse('NEWS_NOT_FOUND', 'Article not found', newRequestId()),
      );
    }
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      body: article.body,
      publishedAt: article.publishedAt,
      documents: article.documents.map((row) => ({
        id: row.document.id,
        title: row.document.title,
        description: row.document.description,
        visibility: row.document.visibility,
      })),
    };
  }

  async create(user: RequestUser, data: CreateNewsDto) {
    const documentIds = data.documentIds ?? [];
    await this.assertDocumentsExist(documentIds);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const article = await tx.news.create({
          data: {
            title: data.title.trim(),
            slug: data.slug.toLowerCase().trim(),
            summary: data.summary,
            body: data.body,
            createdById: user.userId,
          },
        });
        if (documentIds.length > 0) {
          await tx.newsDocument.createMany({
            data: documentIds.map((documentId, sortOrder) => ({
              newsId: article.id,
              documentId,
              sortOrder,
            })),
          });
        }
        return article;
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new ConflictException(
        createErrorResponse('SLUG_EXISTS', 'News slug already exists', newRequestId()),
      );
    }
  }

  async update(id: string, data: UpdateNewsDto) {
    await this.adminGet(id);
    if (data.documentIds) {
      await this.assertDocumentsExist(data.documentIds);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const article = await tx.news.update({
          where: { id },
          data: {
            ...(data.title ? { title: data.title.trim() } : {}),
            ...(data.slug ? { slug: data.slug.toLowerCase().trim() } : {}),
            ...(data.summary !== undefined ? { summary: data.summary } : {}),
            ...(data.body ? { body: data.body } : {}),
          },
        });

        if (data.documentIds) {
          await tx.newsDocument.deleteMany({ where: { newsId: id } });
          if (data.documentIds.length > 0) {
            await tx.newsDocument.createMany({
              data: data.documentIds.map((documentId, sortOrder) => ({
                newsId: id,
                documentId,
                sortOrder,
              })),
            });
          }
        }

        return article;
      });
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      throw new ConflictException(
        createErrorResponse('SLUG_EXISTS', 'News slug already exists', newRequestId()),
      );
    }
  }

  async publish(id: string, actorUserId?: string) {
    await this.adminGet(id);
    const updated = await this.prisma.news.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
    await this.audit.record({
      actorUserId,
      action: 'NEWS_PUBLISH',
      entityType: 'news',
      entityId: id,
    });
    return updated;
  }

  async unpublish(id: string, actorUserId?: string) {
    await this.adminGet(id);
    const updated = await this.prisma.news.update({
      where: { id },
      data: { isPublished: false },
    });
    await this.audit.record({
      actorUserId,
      action: 'NEWS_UNPUBLISH',
      entityType: 'news',
      entityId: id,
    });
    return updated;
  }

  async softDelete(id: string, actorUserId?: string) {
    await this.adminGet(id);
    const updated = await this.prisma.news.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });
    await this.audit.record({
      actorUserId,
      action: 'NEWS_SOFT_DELETE',
      entityType: 'news',
      entityId: id,
    });
    return updated;
  }

  private async assertDocumentsExist(documentIds: string[]) {
    if (documentIds.length === 0) return;
    const unique = [...new Set(documentIds)];
    const count = await this.prisma.document.count({
      where: { id: { in: unique }, deletedAt: null },
    });
    if (count !== unique.length) {
      throw new BadRequestException(
        createErrorResponse(
          'DOCUMENT_NOT_FOUND',
          'One or more documents were not found',
          newRequestId(),
        ),
      );
    }
  }
}
