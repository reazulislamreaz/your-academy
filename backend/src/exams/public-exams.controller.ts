import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { Request } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { parseLimit } from '../common/pagination';
import { SubmitExamAttemptDto } from './dto/submit-exam-attempt.dto';
import { ExamsService } from './exams.service';

/** Unauthenticated guest timed exams (DEC-039); optional JWT links attempt to account (DEC-045). */
@Controller('api/v1/public/exams')
export class PublicExamsController {
  constructor(private readonly exams: ExamsService) {}

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

  @Get('attempts/:attemptId')
  async attemptResult(@Param('attemptId') attemptId: string) {
    return createSuccessResponse(await this.exams.getAttemptResult(attemptId), newRequestId());
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
