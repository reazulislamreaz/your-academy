import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { parseLimit } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import type { RequestUser } from '../auth/auth.types';
import { ModelTestsService } from '../model-tests/model-tests.service';
import { ClaimTimedAttemptDto } from './dto/claim-timed-attempt.dto';
import { ExamsService } from './exams.service';

/**
 * Authenticated history + post-register claim for public Quiz / Model Test attempts (DEC-045).
 */
@Controller('api/v1/me/timed-attempts')
@UseGuards(JwtAuthGuard)
export class MeTimedAttemptsController {
  constructor(
    private readonly exams: ExamsService,
    private readonly modelTests: ModelTestsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query('limit') limitRaw?: string) {
    const take = parseLimit(limitRaw, 40);
    const [examPage, mtPage] = await Promise.all([
      this.exams.listMyAttempts(user.userId, { limit: take }),
      this.modelTests.listMyAttempts(user.userId, { limit: take }),
    ]);
    const items = [...examPage.items, ...mtPage.items]
      .sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      )
      .slice(0, take);
    return createSuccessResponse(
      items,
      newRequestId(),
      cursorPaginationMeta(null, take),
    );
  }

  @Post('claim')
  @UseGuards(CsrfGuard)
  async claim(@CurrentUser() user: RequestUser, @Body() dto: ClaimTimedAttemptDto) {
    const result =
      dto.kind === 'model-test'
        ? await this.modelTests.claimAttempt(user.userId, dto.attemptId)
        : await this.exams.claimAttempt(user.userId, dto.attemptId);
    return createSuccessResponse(result, newRequestId());
  }
}
