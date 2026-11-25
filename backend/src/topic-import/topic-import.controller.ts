import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { newRequestId } from '../common/request-id';
import { TopicImportService } from './topic-import.service';

@Controller('api/v1/admin/topic-question-imports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('topic')
export class TopicImportController {
  constructor(private readonly imports: TopicImportService) {}

  @Get('template')
  async template(@Res() res: Response) {
    const buffer = await this.imports.getTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="your-academy-topic-question-template.xlsx"',
    );
    res.send(buffer);
  }

  @Get()
  async list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const data = await this.imports.listBatches({
      cursor,
      limit: take,
      q,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('stats')
  async stats() {
    return createSuccessResponse(await this.imports.getStats(), newRequestId());
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return createSuccessResponse(await this.imports.getBatch(id), newRequestId());
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async update(
    @Param('id') id: string,
    @Body()
    dto: {
      displayName?: string;
      categoryId?: string;
      subcategoryId?: string;
      childCategoryId?: string | null;
    },
  ) {
    return createSuccessResponse(await this.imports.updateBatch(id, dto), newRequestId());
  }

  @Get(':id/questions')
  async listQuestions(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const data = await this.imports.listQuestions(id, { cursor, limit: take });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Post(':id/questions')
  @UseGuards(CsrfGuard)
  async createQuestion(
    @Param('id') id: string,
    @Body()
    dto: {
      sourceSerial?: string | null;
      questionText?: string;
      examLabel?: string | null;
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswer?: string | null;
      correctKey?: string | null;
    },
  ) {
    return createSuccessResponse(await this.imports.createQuestion(id, dto), newRequestId());
  }

  @Patch(':id/questions/:questionId')
  @UseGuards(CsrfGuard)
  async updateQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body()
    dto: {
      sourceSerial?: string | null;
      questionText?: string;
      examLabel?: string | null;
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswer?: string | null;
      correctKey?: string | null;
      sortOrder?: number;
      rowNumber?: number;
    },
  ) {
    return createSuccessResponse(
      await this.imports.updateQuestion(id, questionId, dto),
      newRequestId(),
    );
  }

  @Delete(':id/questions/:questionId')
  @UseGuards(CsrfGuard)
  async deleteQuestion(@Param('id') id: string, @Param('questionId') questionId: string) {
    return createSuccessResponse(
      await this.imports.deleteQuestion(id, questionId),
      newRequestId(),
    );
  }

  @Patch(':id/archive')
  @UseGuards(CsrfGuard)
  async archive(@Param('id') id: string) {
    return createSuccessResponse(await this.imports.archiveBatch(id), newRequestId());
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  async remove(@Param('id') id: string) {
    return createSuccessResponse(await this.imports.deleteBatch(id), newRequestId());
  }

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('categoryId') categoryId?: string,
    @Body('subcategoryId') subcategoryId?: string,
    @Body('childCategoryId') childCategoryId?: string,
    @Body('displayName') displayName?: string,
  ) {
    const data = await this.imports.upload({
      file,
      categoryId: categoryId ?? '',
      subcategoryId: subcategoryId ?? '',
      childCategoryId: childCategoryId || null,
      displayName,
      uploadedById: user.userId,
    });
    return createSuccessResponse(data, newRequestId());
  }
}
