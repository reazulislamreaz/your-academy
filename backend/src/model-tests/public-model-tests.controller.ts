import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { parseLimit } from '../common/pagination';
import { SubmitModelTestAttemptDto } from './dto/submit-model-test-attempt.dto';
import { ModelTestsService } from './model-tests.service';

/** Unauthenticated guest Model Tests (parallel to DEC-039 guest exams). */
@Controller('api/v1/public/model-tests')
export class PublicModelTestsController {
  constructor(private readonly modelTests: ModelTestsService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('year') yearRaw?: string,
    @Query('categoryId') categoryId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const year = yearRaw?.trim() ? Number(yearRaw) : undefined;
    const take = parseLimit(limitRaw, 12);
    const page = await this.modelTests.listPublished({
      q,
      year: year != null && Number.isFinite(year) ? year : undefined,
      categoryId,
      cursor,
      limit: take,
    });
    return createSuccessResponse(
      page.items,
      newRequestId(),
      cursorPaginationMeta(page.nextCursor, take),
    );
  }

  @Get('meta/years')
  async years() {
    return createSuccessResponse(await this.modelTests.listFilterYears(), newRequestId());
  }

  @Get('meta/categories')
  async categories() {
    return createSuccessResponse(
      await this.modelTests.listPublishedCategories(),
      newRequestId(),
    );
  }

  @Get('attempts/:attemptId')
  async attemptResult(@Param('attemptId') attemptId: string) {
    return createSuccessResponse(
      await this.modelTests.getAttemptResult(attemptId),
      newRequestId(),
    );
  }

  @Get(':idOrSlug')
  async detail(@Param('idOrSlug') idOrSlug: string) {
    return createSuccessResponse(
      await this.modelTests.getPublishedForTaking(idOrSlug),
      newRequestId(),
    );
  }

  @Post(':idOrSlug/attempts')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async submit(@Param('idOrSlug') idOrSlug: string, @Body() dto: SubmitModelTestAttemptDto) {
    return createSuccessResponse(
      await this.modelTests.submitAttempt(idOrSlug, dto),
      newRequestId(),
    );
  }
}
