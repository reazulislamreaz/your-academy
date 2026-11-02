import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { BookmarksService } from './bookmarks.service';

@Controller('api/v1/bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get('questions')
  async listQuestions(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.bookmarks.listQuestions(user, cursor, limit ? Number(limit) : 20);
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Post('questions')
  @UseGuards(CsrfGuard)
  async addQuestion(@CurrentUser() user: RequestUser, @Body() body: { questionId: string }) {
    return createSuccessResponse(
      await this.bookmarks.addQuestion(user, body.questionId),
      newRequestId(),
    );
  }

  @Delete('questions/:questionId')
  @UseGuards(CsrfGuard)
  async removeQuestion(@CurrentUser() user: RequestUser, @Param('questionId') questionId: string) {
    return createSuccessResponse(await this.bookmarks.removeQuestion(user, questionId), newRequestId());
  }

  @Get('documents')
  async listDocuments(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.bookmarks.listDocuments(user, cursor, limit ? Number(limit) : 20);
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Post('documents')
  @UseGuards(CsrfGuard)
  async addDocument(@CurrentUser() user: RequestUser, @Body() body: { documentId: string }) {
    return createSuccessResponse(
      await this.bookmarks.addDocument(user, body.documentId),
      newRequestId(),
    );
  }

  @Delete('documents/:documentId')
  @UseGuards(CsrfGuard)
  async removeDocument(
    @CurrentUser() user: RequestUser,
    @Param('documentId') documentId: string,
  ) {
    return createSuccessResponse(
      await this.bookmarks.removeDocument(user, documentId),
      newRequestId(),
    );
  }
}
