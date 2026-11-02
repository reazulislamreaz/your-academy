import { Injectable, NotFoundException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

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

  async create(user: RequestUser, data: { title: string; slug: string; summary?: string; body: string }) {
    return this.prisma.news.create({
      data: {
        title: data.title,
        slug: data.slug.toLowerCase(),
        summary: data.summary,
        body: data.body,
        createdById: user.userId,
      },
    });
  }

  async publish(id: string) {
    return this.prisma.news.update({
      where: { id },
      data: { isPublished: true, publishedAt: new Date() },
    });
  }
}
