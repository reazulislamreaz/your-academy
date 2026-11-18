import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createSuccessResponse } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { SubmitExamAttemptDto } from './dto/submit-exam-attempt.dto';
import { ExamsService } from './exams.service';

/** Unauthenticated guest timed exams (DEC-039). */
@Controller('api/v1/public/exams')
export class PublicExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  async list() {
    return createSuccessResponse(await this.exams.listPublished(), newRequestId());
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
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async submit(@Param('idOrSlug') idOrSlug: string, @Body() dto: SubmitExamAttemptDto) {
    return createSuccessResponse(await this.exams.submitAttempt(idOrSlug, dto), newRequestId());
  }
}
