import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { AnswerAttemptDto, AttachQuestionsDto } from './dto/answer-attempt.dto';
import type { CreateExamPaperDto, UpdateExamPaperDto } from './dto/create-exam-paper.dto';
import { ExamsService } from './exams.service';

@Controller('api/v1')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  // ─── Public paper metadata (no question content) ───────────────────────────

  @Get('exam-papers')
  async listPapers() {
    return createSuccessResponse(await this.exams.listPapers(), newRequestId());
  }

  // ─── Learner attempts ─────────────────────────────────────────────────────

  @Get('exam-attempts/me')
  @UseGuards(JwtAuthGuard)
  async myAttempts(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.exams.myAttempts(user), newRequestId());
  }

  @Get('exam-attempts/:id')
  @UseGuards(JwtAuthGuard)
  async getAttempt(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.exams.getAttempt(user, id), newRequestId());
  }

  @Post('exam-attempts/:id/answer')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async answer(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AnswerAttemptDto,
  ) {
    return createSuccessResponse(await this.exams.answerAttempt(user, id, dto), newRequestId());
  }

  @Post('exam-attempts/:id/submit')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async submit(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.exams.submitAttempt(user, id), newRequestId());
  }

  // ─── Paper detail + start (authenticated; question content stays gated) ───

  @Get('exam-papers/:slug')
  @UseGuards(JwtAuthGuard)
  async getPaper(@Param('slug') slug: string) {
    return createSuccessResponse(await this.exams.getPaperBySlug(slug), newRequestId());
  }

  @Post('exam-papers/:id/start')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async start(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.exams.startAttempt(user, id), newRequestId());
  }

  // ─── Admin paper management ────────────────────────────────────────────────

  @Get('admin/exam-papers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminList() {
    return createSuccessResponse(await this.exams.adminList(), newRequestId());
  }

  @Post('admin/exam-papers')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateExamPaperDto) {
    return createSuccessResponse(await this.exams.create(user, dto), newRequestId());
  }

  @Get('admin/exam-papers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGet(@Param('id') id: string) {
    return createSuccessResponse(await this.exams.adminGet(id), newRequestId());
  }

  @Patch('admin/exam-papers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateExamPaperDto) {
    return createSuccessResponse(await this.exams.update(id, dto), newRequestId());
  }

  @Delete('admin/exam-papers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return createSuccessResponse(await this.exams.remove(id), newRequestId());
  }

  @Post('admin/exam-papers/:id/questions')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async attach(
    @Param('id') id: string,
    @Body() dto: AttachQuestionsDto,
  ) {
    return createSuccessResponse(
      await this.exams.attachQuestions(id, dto.questionIds),
      newRequestId(),
    );
  }

  @Delete('admin/exam-papers/:id/questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async detach(@Param('id') id: string, @Param('questionId') questionId: string) {
    return createSuccessResponse(await this.exams.detachQuestion(id, questionId), newRequestId());
  }
}
