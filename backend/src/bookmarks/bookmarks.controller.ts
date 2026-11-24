import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { BookmarksService } from './bookmarks.service';
import {
  CreateBookmarkCollectionDto,
  CreateDocumentBookmarkDto,
  CreateQuestionBookmarkDto,
  MoveQuestionBookmarkDto,
  ScoreSavedPracticeDto,
  UpdateBookmarkCollectionDto,
} from './dto/create-bookmark.dto';

@Controller('api/v1/bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get('collections')
  async listCollections(
    @CurrentUser() user: RequestUser,
    @Query('questionId') questionId?: string,
    @Query('documentId') documentId?: string,
  ) {
    return createSuccessResponse(
      await this.bookmarks.listCollections(user, { questionId, documentId }),
      newRequestId(),
    );
  }

  @Post('collections')
  @UseGuards(CsrfGuard)
  async createCollection(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateBookmarkCollectionDto,
  ) {
    const created = await this.bookmarks.createCollection(user.userId, body.name);
    return createSuccessResponse(
      { ...created, questionCount: 0 },
      newRequestId(),
    );
  }

  @Patch('collections/:id')
  @UseGuards(CsrfGuard)
  async renameCollection(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateBookmarkCollectionDto,
  ) {
    return createSuccessResponse(
      await this.bookmarks.renameCollection(user, id, body.name),
      newRequestId(),
    );
  }

  @Delete('collections/:id')
  @UseGuards(CsrfGuard)
  async deleteCollection(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.bookmarks.deleteCollection(user, id), newRequestId());
  }

  @Get('questions')
  async listQuestions(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('collectionId') collectionId?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    const data = await this.bookmarks.listQuestions(user, {
      cursor,
      limit: parsedLimit,
      categoryId,
      collectionId: collectionId as string | 'uncategorized' | undefined,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: parsedLimit,
      total: null,
    });
  }

  /** Saved MCQs with options (answer fields gated, DEC-051) for View All and saved exams. */
  @Get('questions/details')
  async listQuestionDetails(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('collectionId') collectionId?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    const data = await this.bookmarks.listQuestionDetails(user, {
      cursor,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 20,
      collectionId,
    });
    return createSuccessResponse(
      { items: data.items, answersVisible: data.answersVisible },
      newRequestId(),
      { nextCursor: data.nextCursor, prevCursor: null, limit: parsedLimit, total: null },
    );
  }

  /**
   * Score an exam built from the user's saved MCQs. Throttled like the Preli
   * Practice scorer: any score endpoint is a weak answer oracle (DEC-051).
   */
  @Post('questions/practice-score')
  @HttpCode(200)
  @UseGuards(CsrfGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async scoreSavedPractice(
    @CurrentUser() user: RequestUser,
    @Body() body: ScoreSavedPracticeDto,
  ) {
    return createSuccessResponse(
      await this.bookmarks.scoreSavedPractice(user, body.questionIds, body.answers ?? {}),
      newRequestId(),
    );
  }

  @Post('questions')
  @UseGuards(CsrfGuard)
  async addQuestion(@CurrentUser() user: RequestUser, @Body() body: CreateQuestionBookmarkDto) {
    return createSuccessResponse(
      await this.bookmarks.addQuestion(user, body.questionId, {
        collectionId: body.collectionId,
        newCollectionName: body.newCollectionName,
      }),
      newRequestId(),
    );
  }

  @Patch('questions/:questionId')
  @UseGuards(CsrfGuard)
  async moveQuestion(
    @CurrentUser() user: RequestUser,
    @Param('questionId') questionId: string,
    @Body() body: MoveQuestionBookmarkDto,
  ) {
    return createSuccessResponse(
      await this.bookmarks.moveQuestion(user, questionId, body.collectionId),
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
    @Query('collectionId') collectionId?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 20;
    const data = await this.bookmarks.listDocuments(user, {
      cursor,
      limit: parsedLimit,
      collectionId,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: parsedLimit,
      total: null,
    });
  }

  @Post('documents')
  @UseGuards(CsrfGuard)
  async addDocument(@CurrentUser() user: RequestUser, @Body() body: CreateDocumentBookmarkDto) {
    return createSuccessResponse(
      await this.bookmarks.addDocument(user, body.documentId, {
        collectionId: body.collectionId,
        newCollectionName: body.newCollectionName,
      }),
      newRequestId(),
    );
  }

  @Patch('documents/:documentId')
  @UseGuards(CsrfGuard)
  async moveDocument(
    @CurrentUser() user: RequestUser,
    @Param('documentId') documentId: string,
    @Body() body: MoveQuestionBookmarkDto,
  ) {
    return createSuccessResponse(
      await this.bookmarks.moveDocument(user, documentId, body.collectionId),
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
