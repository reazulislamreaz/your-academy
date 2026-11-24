import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Difficulty } from '@prisma/client';
import type { Request, Response } from 'express';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { DocumentsService } from '../documents/documents.service';
import { parseLimit } from '../common/pagination';
import { AccessPolicyService, type ViewerAccess } from '../billing/access-policy.service';
import { ScorePracticeDto } from './dto/score-practice.dto';
import { PublicService } from './public.service';
import { setViewerCacheHeaders } from './viewer-cache';

type ViewerRequest = Request & { user?: RequestUser | null };

const SHORT_PUBLIC_CACHE = 'public, max-age=30, s-maxage=60, stale-while-revalidate=120';

/**
 * Unauthenticated marketing + public question bank (DEC-031).
 * DEC-060: Preli / Written sets beyond the free N are locked for viewers without full
 * access — routes read the optional session and ask AccessPolicyService.
 */
@Controller('api/v1/public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly documentsService: DocumentsService,
    private readonly access: AccessPolicyService,
  ) {}

  /** Per-viewer access; signed-in responses are never shared-cached (locks differ). */
  private async viewerAccess(
    req: ViewerRequest,
    res: Response,
    anonymousCacheControl?: string,
  ): Promise<ViewerAccess> {
    setViewerCacheHeaders(res, req.user, anonymousCacheControl);
    return this.access.resolve(req.user);
  }

  /** Public aggregate counters — short shared cache (no user-specific data). */
  @Get('stats')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120')
  async stats() {
    return createSuccessResponse(await this.publicService.stats(), newRequestId());
  }

  /** Published PUBLIC documents for পত্রিকার গুরুত্বপূর্ণ কলাম (no login). */
  @Get('documents')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120')
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
  @Header('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
  async questionSetYears() {
    return createSuccessResponse(await this.publicService.listQuestionSetYears(), newRequestId());
  }

  /** Upload-based Question Sets (one per admin import batch). */
  @Get('question-sets')
  @UseGuards(OptionalJwtAuthGuard)
  async questionSets(
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('year') year?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const access = await this.viewerAccess(req, res, SHORT_PUBLIC_CACHE);
    const data = await this.publicService.listQuestionSets(
      { cursor, limit: take, q, categoryId, subcategoryId, year },
      access,
    );
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  @Get('question-sets/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async questionSet(
    @Param('id') id: string,
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const access = await this.viewerAccess(req, res);
    return createSuccessResponse(
      await this.publicService.getQuestionSet(id, access),
      newRequestId(),
    );
  }

  @Get('question-sets/:id/questions')
  @UseGuards(OptionalJwtAuthGuard)
  async questionSetQuestions(
    @Param('id') id: string,
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const view = await this.viewerAccess(req, res);
    const data = await this.publicService.listSetQuestions(
      id,
      {
        cursor,
        limit: take,
        q,
      },
      view,
    );
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  /**
   * Score a Preli Practice run server-side (totals, own selections and the key).
   * Locked sets are refused (DEC-060). Throttled to limit bulk answer harvesting.
   */
  @Post('question-sets/:id/practice-score')
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async scoreQuestionSetPractice(
    @Param('id') id: string,
    @Body() dto: ScorePracticeDto,
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const view = await this.viewerAccess(req, res, 'no-store');
    return createSuccessResponse(
      await this.publicService.scoreSetPractice(id, dto.answers ?? {}, view),
      newRequestId(),
    );
  }

  /** DEC-040 — Written Question Bank years */
  @Get('written-question-sets/years')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
  async writtenQuestionSetYears() {
    return createSuccessResponse(
      await this.publicService.listWrittenQuestionSetYears(),
      newRequestId(),
    );
  }

  @Get('written-question-sets')
  @UseGuards(OptionalJwtAuthGuard)
  async writtenQuestionSets(
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('year') year?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const access = await this.viewerAccess(req, res, SHORT_PUBLIC_CACHE);
    const data = await this.publicService.listWrittenQuestionSets(
      { cursor, limit: take, q, categoryId, subcategoryId, year },
      access,
    );
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  @Get('written-question-sets/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async writtenQuestionSet(
    @Param('id') id: string,
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const access = await this.viewerAccess(req, res);
    return createSuccessResponse(
      await this.publicService.getWrittenQuestionSet(id, access),
      newRequestId(),
    );
  }

  @Get('written-question-sets/:id/questions')
  @UseGuards(OptionalJwtAuthGuard)
  async writtenQuestionSetQuestions(
    @Param('id') id: string,
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const view = await this.viewerAccess(req, res);
    const data = await this.publicService.listWrittenSetQuestions(
      id,
      {
        cursor,
        limit: take,
        q,
      },
      view,
    );
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  /** Topic Base Question Analysis directory (DEC-042). */
  @Get('topic-directory')
  @Header('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300')
  async topicDirectory() {
    return createSuccessResponse(await this.publicService.listTopicDirectory(), newRequestId());
  }

  @Get('topic-subcategories/:id')
  async topicSubcategory(@Param('id') id: string) {
    return createSuccessResponse(
      await this.publicService.getTopicSubcategory(id),
      newRequestId(),
    );
  }

  /** Topic Base is free for everyone (not part of the DEC-060 paid system). */
  @Get('topic-subcategories/:id/questions')
  @Header('Cache-Control', SHORT_PUBLIC_CACHE)
  async topicQuestions(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.publicService.listTopicQuestions({
      subcategoryId: id,
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

  /** Title-first Topic collections for a leaf Sub/Child folder. */
  @Get('topic-subcategories/:id/sets')
  async topicSets(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.publicService.listTopicSets(id, { cursor, limit: take });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }

  @Get('topic-sets/:id')
  async topicSet(@Param('id') id: string) {
    return createSuccessResponse(await this.publicService.getTopicSet(id), newRequestId());
  }

  /** Topic Base is free for everyone (not part of the DEC-060 paid system). */
  @Get('topic-sets/:id/questions')
  @Header('Cache-Control', SHORT_PUBLIC_CACHE)
  async topicSetQuestions(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.publicService.listTopicSetQuestions({
      batchId: id,
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

  /** Anonymous responses keep the shared cache; signed-in ones are private (locks differ). */
  @Get('questions')
  @UseGuards(OptionalJwtAuthGuard)
  async questions(
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
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
    const view = await this.viewerAccess(
      req,
      res,
      'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    );
    const data = await this.publicService.listPublishedQuestions(
      {
        cursor,
        limit: take,
        categoryId,
        subcategoryId,
        difficulty,
        q,
        examTag,
        uploadBatchId,
      },
      view,
    );
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take, data.total),
    );
  }
}
