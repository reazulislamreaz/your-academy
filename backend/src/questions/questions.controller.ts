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
import { Difficulty, QuestionStatus, UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('api/v1')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}

  @Get('questions')
  @UseGuards(JwtAuthGuard)
  async list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('difficulty') difficulty?: Difficulty,
    @Query('q') q?: string,
    @Query('examTag') examTag?: string,
  ) {
    const data = await this.questions.listPublished(user, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      categoryId,
      subcategoryId,
      difficulty,
      q,
      examTag,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Get('questions/:id')
  @UseGuards(JwtAuthGuard)
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.questions.getPublishedDetail(user, id), newRequestId());
  }

  @Get('questions/:id/navigation')
  @UseGuards(JwtAuthGuard)
  async navigation(
    @Param('id') id: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('difficulty') difficulty?: Difficulty,
    @Query('q') q?: string,
    @Query('examTag') examTag?: string,
  ) {
    return createSuccessResponse(
      await this.questions.navigation(id, { categoryId, subcategoryId, difficulty, q, examTag }),
      newRequestId(),
    );
  }

  @Post('questions/:id/attempts')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async recordAttempt(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CreateAttemptDto,
  ) {
    return createSuccessResponse(
      await this.questions.recordAttempt(user, id, dto.selectedOptionId),
      newRequestId(),
    );
  }

  @Get('admin/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminList(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: QuestionStatus,
  ) {
    const data = await this.questions.adminList({
      cursor,
      limit: limit ? Number(limit) : undefined,
      status,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Post('admin/questions')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateQuestionDto) {
    return createSuccessResponse(await this.questions.createDraft(user, dto), newRequestId());
  }

  @Get('admin/questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGet(@Param('id') id: string) {
    return createSuccessResponse(await this.questions.adminGet(id), newRequestId());
  }

  @Patch('admin/questions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return createSuccessResponse(await this.questions.update(id, dto), newRequestId());
  }

  @Post('admin/questions/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async publish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.questions.publish(id, user.userId), newRequestId());
  }

  @Post('admin/questions/:id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async archive(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.questions.archive(id, user.userId), newRequestId());
  }
}
