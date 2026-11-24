import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { Request, Response } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { parseLimit } from '../common/pagination';
import { setViewerCacheHeaders } from '../public/viewer-cache';
import { AccessPolicyService, type ViewerAccess } from '../billing/access-policy.service';
import { SubmitModelTestAttemptDto } from './dto/submit-model-test-attempt.dto';
import { ModelTestsService } from './model-tests.service';

type ViewerRequest = Request & { user?: RequestUser | null };

/**
 * Guest Model Tests; optional JWT links attempt to account (DEC-045).
 * DEC-060: PAID tests are listed with `locked` and refuse detail / submit / result.
 */
@Controller('api/v1/public/model-tests')
export class PublicModelTestsController {
  constructor(
    private readonly modelTests: ModelTestsService,
    private readonly access: AccessPolicyService,
  ) {}

  private viewer(req: ViewerRequest, res: Response, anonymousCache?: string): Promise<ViewerAccess> {
    setViewerCacheHeaders(res, req.user, anonymousCache);
    return this.access.resolve(req.user);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async list(
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
    @Query('q') q?: string,
    @Query('year') yearRaw?: string,
    @Query('categoryId') categoryId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const year = yearRaw?.trim() ? Number(yearRaw) : undefined;
    const take = parseLimit(limitRaw, 12);
    const viewer = await this.viewer(req, res, 'public, max-age=30, s-maxage=60');
    const page = await this.modelTests.listPublished(
      {
        q,
        year: year != null && Number.isFinite(year) ? year : undefined,
        categoryId,
        cursor,
        limit: take,
      },
      viewer,
    );
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

  @Get('meta/guide')
  async guide() {
    return createSuccessResponse(await this.modelTests.getGuide(), newRequestId());
  }

  @Get('attempts/:attemptId')
  @UseGuards(OptionalJwtAuthGuard)
  async attemptResult(
    @Param('attemptId') attemptId: string,
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const viewer = await this.viewer(req, res, 'no-store');
    return createSuccessResponse(
      await this.modelTests.getAttemptResult(attemptId, viewer),
      newRequestId(),
    );
  }

  @Get(':idOrSlug')
  @UseGuards(OptionalJwtAuthGuard)
  async detail(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req: ViewerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const viewer = await this.viewer(req, res);
    return createSuccessResponse(
      await this.modelTests.getPublishedForTaking(idOrSlug, viewer),
      newRequestId(),
    );
  }

  @Post(':idOrSlug/attempts')
  @UseGuards(OptionalJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async submit(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: SubmitModelTestAttemptDto,
    @Req() req: ViewerRequest,
  ) {
    const viewer = await this.access.resolve(req.user);
    return createSuccessResponse(
      await this.modelTests.submitAttempt(idOrSlug, dto, req.user ?? null, viewer),
      newRequestId(),
    );
  }
}
