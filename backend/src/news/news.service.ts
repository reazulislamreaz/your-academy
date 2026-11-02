import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import type { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

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
    });
    if (!article) {
      throw new NotFoundException(
        createErrorResponse('NEWS_NOT_FOUND', 'Article not found', newRequestId()),
      );
    }
    return article;
  }

  async getBySlug(slug: string) {
    const article = await this.prisma.news.findFirst({
      where: { slug, isPublished: true, deletedAt: null },
      include: {
        documents: {
          include: {
            document: {
              select: { id: true, title: true, description: true, visibility: true },
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
    return article;
  }

  async create(user: RequestUser, data: CreateNewsDto) {
    try {
      return await this.prisma.news.create({
        data: {
          title: data.title.trim(),
          slug: data.slug.toLowerCase().trim(),
          summary: data.summary,
          body: data.body,
          createdById: user.userId,
        },
      });
    } catch {
      throw new ConflictException(
        createErrorResponse('SLUG_EXISTS', 'News slug already exists', newRequestId()),
      );
    }
  }

  async update(id: string, data: UpdateNewsDto) {
    await this.adminGet(id);
    try {
      return await this.prisma.news.update({
        where: { id },
        data: {
          ...(data.title ? { title: data.title.trim() } : {}),
          ...(data.slug ? { slug: data.slug.toLowerCase().trim() } : {}),
          ...(data.summary !== undefined ? { summary: data.summary } : {}),
          ...(data.body ? { body: data.body } : {}),
        },
      });
    } catch {
      throw new ConflictException(
        createErrorResponse('SLUG_EXISTS', 'News slug already exists', newRequestId()),
      );
    }
  }

  async publish(id: string) {
    await this.adminGet(id);
    return this.prisma.news.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }

  async unpublish(id: string) {
    await this.adminGet(id);
    return this.prisma.news.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  async softDelete(id: string) {
    await this.adminGet(id);
    return this.prisma.news.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });
  }
}
