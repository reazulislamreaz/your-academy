import { Controller, Get } from '@nestjs/common';
import { QuestionStatus } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

/** Unauthenticated marketing stats — counts only, no question content. */
@Controller('api/v1/public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const [questions, categories, news, documents] = await Promise.all([
      this.prisma.question.count({
        where: { status: QuestionStatus.PUBLISHED, deletedAt: null },
      }),
      this.prisma.category.count({
        where: { isActive: true, parentId: null },
      }),
      this.prisma.news.count({
        where: { isPublished: true, deletedAt: null },
      }),
      this.prisma.document.count({
        where: { isPublished: true, deletedAt: null },
      }),
    ]);

    return createSuccessResponse(
      { questions, categories, news, documents },
      newRequestId(),
    );
  }
}
