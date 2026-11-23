import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PracticeSetStatus } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { newRequestId } from '../common/request-id';
import {
  CreatePracticeSetDto,
  SaveProgressDto,
  StartAttemptDto,
  SubmitAttemptDto,
  UpdatePracticeSetDto,
} from './dto/submit-attempt.dto';
import { PracticeService } from './practice.service';

@Controller('api/v1')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Get('practice-sets')
  @UseGuards(JwtAuthGuard)
  async list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('kind') kind?: string,
    @Query('examTag') examTag?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('isDaily') isDaily?: string,
  ) {
    const data = await this.practice.listPublished({
      cursor,
      limit: limit ? Number(limit) : undefined,
      kind,
      examTag,
      categoryId,
      subcategoryId,
      isDaily: isDaily === undefined ? undefined : isDaily === 'true' || isDaily === '1',
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Get('practice-sets/:idOrSlug')
  @UseGuards(JwtAuthGuard)
  async detail(@CurrentUser() user: RequestUser, @Param('idOrSlug') idOrSlug: string) {
    return createSuccessResponse(
      await this.practice.getPublishedDetail(user, idOrSlug),
      newRequestId(),
    );
  }

  @Post('practice-sets/:idOrSlug/attempts')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async start(
    @CurrentUser() user: RequestUser,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: StartAttemptDto,
  ) {
    return createSuccessResponse(
      await this.practice.startAttempt(user, idOrSlug, dto ?? {}),
      newRequestId(),
    );
  }

  @Patch('practice-attempts/:id/progress')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async saveProgress(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SaveProgressDto,
  ) {
    return createSuccessResponse(
      await this.practice.saveProgress(user, id, dto),
      newRequestId(),
    );
  }

  @Post('practice-attempts/:id/submit')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async submit(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return createSuccessResponse(await this.practice.submitAttempt(user, id, dto), newRequestId());
  }

  @Get('practice-attempts/:id')
  @UseGuards(JwtAuthGuard)
  async attemptResult(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.practice.getAttemptResult(user, id), newRequestId());
  }

  @Get('me/practice-attempts')
  @UseGuards(JwtAuthGuard)
  async myAttempts(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.practice.listMyAttempts(user, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Get('me/exam-performance')
  @UseGuards(JwtAuthGuard)
  async examPerformance(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(
      await this.practice.getExamPerformance(user.userId),
      newRequestId(),
    );
  }

  @Get('admin/practice-sets')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('quiz')
  async adminList(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PracticeSetStatus,
    @Query('kind') kind?: string,
  ) {
    const data = await this.practice.adminList({
      cursor,
      limit: limit ? Number(limit) : undefined,
      status,
      kind,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Post('admin/practice-sets')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('quiz')
  async adminCreate(@CurrentUser() user: RequestUser, @Body() dto: CreatePracticeSetDto) {
    return createSuccessResponse(await this.practice.adminCreate(user, dto), newRequestId());
  }

  @Patch('admin/practice-sets/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('quiz')
  async adminUpdate(@Param('id') id: string, @Body() dto: UpdatePracticeSetDto) {
    return createSuccessResponse(await this.practice.adminUpdate(id, dto), newRequestId());
  }

  @Patch('admin/practice-sets/:id/publish')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('quiz')
  async adminPublish(@Param('id') id: string) {
    return createSuccessResponse(await this.practice.adminPublish(id), newRequestId());
  }

  @Patch('admin/practice-sets/:id/archive')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('quiz')
  async adminArchive(@Param('id') id: string) {
    return createSuccessResponse(await this.practice.adminArchive(id), newRequestId());
  }

  @Get('admin/practice-attempts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('examResults')
  async adminAttempts(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('practiceSetId') practiceSetId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('minPercent') minPercent?: string,
    @Query('maxPercent') maxPercent?: string,
  ) {
    const data = await this.practice.adminListAttempts({
      cursor,
      limit: limit ? Number(limit) : undefined,
      userId,
      practiceSetId,
      categoryId,
      status,
      minPercent: minPercent != null && minPercent !== '' ? Number(minPercent) : undefined,
      maxPercent: maxPercent != null && maxPercent !== '' ? Number(maxPercent) : undefined,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Get('admin/practice-attempts/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('examResults')
  async adminAttemptDetail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(
      await this.practice.getAttemptResult(user, id, { asAdmin: true }),
      newRequestId(),
    );
  }
}
