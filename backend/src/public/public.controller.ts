import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { Difficulty } from '@prisma/client';
import type { Response } from 'express';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { DocumentsService } from '../documents/documents.service';
import { parseLimit } from '../common/pagination';
import { PublicService } from './public.service';

/** Unauthenticated marketing + public question bank (DEC-031). */
@Controller('api/v1/public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get('stats')
  async stats() {
    return createSuccessResponse(await this.publicService.stats(), newRequestId());
  }

  /** Published PUBLIC documents for পত্রিকার গুরুত্বপূর্ণ কলাম (no login). */
  @Get('documents')
  async listDocuments(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = parseLimit(limit, 20);
    const data = await this.documentsService.listPublicPublished({
      cursor,
      limit: take,
      q,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('documents/:id')
  async getDocument(@Param('id') id: string) {
    return createSuccessResponse(
      await this.documentsService.getPublicPublished(id),
      newRequestId(),
    );
  }

  /**
   * Controlled PDF bytes for the in-app viewer (DEC-033).
   * Inline disposition only — no attachment filename / download UX.
   * Does not expose Cloudinary URLs to the browser.
   */
  @Get('documents/:id/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, max-age=60, no-transform')
  @Header('Content-Disposition', 'inline')
  async streamDocument(@Param('id') id: string, @Res() res: Response) {
    const file = await this.documentsService.getPublicPdfBytes(id);
    const type = file.contentType.toLowerCase().includes('pdf')
      ? 'application/pdf'
      : file.contentType;
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', String(file.buffer.length));
    res.send(file.buffer);
  }

  /** Distinct published exam years for Preli bank year chips (dynamic; no hard-coded list). */
  @Get('question-sets/years')
  async questionSetYears() {
    return createSuccessResponse(await this.publicService.listQuestionSetYears(), newRequestId());
  }

  /** Upload-based Question Sets (one per admin import batch). */
  @Get('question-sets')
  async questionSets(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('year') year?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.publicService.listQuestionSets({
      cursor,
      limit: take,
      q,
      categoryId,
      subcategoryId,
      year,
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
