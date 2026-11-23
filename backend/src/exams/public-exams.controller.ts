import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { Request, Response } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { parseLimit } from '../common/pagination';
import { setViewerCacheHeaders } from '../public/viewer-cache';
import { AccessControlService } from '../subscriptions/access-control.service';
import { SubmitExamAttemptDto } from './dto/submit-exam-attempt.dto';
import { ExamsService } from './exams.service';

/** Unauthenticated guest timed exams (DEC-039); optional JWT links attempt to account (DEC-045). */
@Controller('api/v1/public/exams')
export class PublicExamsController {
  constructor(
    private readonly exams: ExamsService,
    private readonly access: AccessControlService,
  ) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const take = parseLimit(limitRaw, 12);
    const page = await this.exams.listPublished({ q, cursor, limit: take });
    return createSuccessResponse(
      page.items,
      newRequestId(),
      cursorPaginationMeta(page.nextCursor, take),
    );
  }

  @Get('meta/guide')
  async guide() {
    return createSuccessResponse(await this.exams.getGuide(), newRequestId());
  }

  /** DEC-051: answer key / explanations only for entitled viewers. */
  @Get('attempts/:attemptId')
  @UseGuards(OptionalJwtAuthGuard)
  async attemptResult(
    @Param('attemptId') attemptId: string,
    @Req() req: Request & { user?: RequestUser | null },
    @Res({ passthrough: true }) res: Response,
  ) {
    setViewerCacheHeaders(res, req.user, 'no-store');
    const canViewAnswers = await this.access.canViewerSeeAnswers(req.user);
    return createSuccessResponse(
      await this.exams.getAttemptResult(attemptId, { canViewAnswers }),
      newRequestId(),
    );
  }

  @Get(':idOrSlug')
  async detail(@Param('idOrSlug') idOrSlug: string) {
    return createSuccessResponse(
      await this.exams.getPublishedForTaking(idOrSlug),
      newRequestId(),
    );
  }

  @Post(':idOrSlug/attempts')
  @UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async submit(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: SubmitExamAttemptDto,
    @Req() req: Request & { user?: RequestUser | null },
  ) {
    return createSuccessResponse(
      await this.exams.submitAttempt(idOrSlug, dto, req.user ?? null),
      newRequestId(),
    );
  }
}
