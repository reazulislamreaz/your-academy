import { Controller, Get, Param, Query } from '@nestjs/common';
import { Difficulty } from '@prisma/client';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PublicService } from './public.service';

/** Unauthenticated marketing + public question bank (DEC-031). */
@Controller('api/v1/public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('stats')
  async stats() {
    return createSuccessResponse(await this.publicService.stats(), newRequestId());
  }

  /** Upload-based Question Sets (one per admin import batch). */
  @Get('question-sets')
  async questionSets(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.publicService.listQuestionSets({
      cursor,
      limit: take,
      q,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  @Get('question-sets/:id')
  async questionSet(@Param('id') id: string) {
    return createSuccessResponse(await this.publicService.getQuestionSet(id), newRequestId());
  }

  @Get('question-sets/:id/questions')
  async questionSetQuestions(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.publicService.listSetQuestions(id, {
      cursor,
      limit: take,
      q,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  @Get('questions')
  async questions(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('difficulty') difficulty?: Difficulty,
    @Query('q') q?: string,
    @Query('examTag') examTag?: string,
    @Query('uploadBatchId') uploadBatchId?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.publicService.listPublishedQuestions({
      cursor,
      limit: take,
      categoryId,
      subcategoryId,
      difficulty,
      q,
      examTag,
      uploadBatchId,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }
}
