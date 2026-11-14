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
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionImportRowStatus, QuestionUploadStatus, UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { UpdateImportRowDto } from './dto/update-import-row.dto';
import { QuestionImportService } from './question-import.service';

@Controller('api/v1/admin/question-imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class QuestionImportController {
  constructor(private readonly imports: QuestionImportService) {}

  @Get('template')
  async template(@Res() res: Response) {
    const buffer = await this.imports.getTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="your-academy-question-template.xlsx"',
    );
    res.send(buffer);
  }

  @Get('stats')
  async stats() {
    return createSuccessResponse(await this.imports.getStats(), newRequestId());
  }

  @Get()
  async list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: QuestionUploadStatus,
    @Query('q') q?: string,
    @Query('subject') subject?: string,
    @Query('examCategory') examCategory?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sort') sort?: string,
  ) {
    const data = await this.imports.listBatches({
      cursor,
      limit: limit ? Number(limit) : undefined,
      status,
      q,
      subject,
      examCategory,
      dateFrom,
      dateTo,
      sort,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Post('upload')
  @UseGuards(CsrfGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('batchCode') batchCode?: string,
    @Body('displayName') displayName?: string,
    @Body('description') description?: string,
    @Body('subjectHint') subjectHint?: string,
    @Body('topicHint') topicHint?: string,
    @Body('examCategoryHint') examCategoryHint?: string,
    @Body('placementSubcategoryIds') placementSubcategoryIdsRaw?: string,
    @Body('questionDate') questionDate?: string,
  ) {
    let placementSubcategoryIds: string[] | undefined;
    if (placementSubcategoryIdsRaw?.trim()) {
      try {
        const parsed = JSON.parse(placementSubcategoryIdsRaw) as unknown;
        if (Array.isArray(parsed)) {
          placementSubcategoryIds = parsed.map(String);
        }
      } catch {
        placementSubcategoryIds = placementSubcategoryIdsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return createSuccessResponse(
      await this.imports.upload(user, file, {
        batchCode,
        displayName,
        description,
        subjectHint,
        topicHint,
        examCategoryHint,
        placementSubcategoryIds,
        questionDate,
      }),
      newRequestId(),
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return createSuccessResponse(await this.imports.getBatch(id), newRequestId());
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return createSuccessResponse(await this.imports.updateBatch(id, dto), newRequestId());
  }

  @Get(':id/rows')
  async rows(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: QuestionImportRowStatus,
  ) {
    const data = await this.imports.listRows(id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      status,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 50,
      total: null,
    });
  }

  @Patch(':id/rows/:rowId')
  @UseGuards(CsrfGuard)
  async updateRow(
    @Param('id') id: string,
    @Param('rowId') rowId: string,
    @Body() dto: UpdateImportRowDto,
  ) {
    return createSuccessResponse(
      await this.imports.updateImportRow(id, rowId, dto),
      newRequestId(),
    );
  }

  @Post(':id/confirm')
  @UseGuards(CsrfGuard)
  async confirm(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: ConfirmImportDto,
  ) {
    return createSuccessResponse(
      await this.imports.confirmImport(user, id, {
        skipDuplicates: dto.skipDuplicates ?? true,
      }),
      newRequestId(),
    );
  }

  @Get(':id/file')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.imports.readOriginalFile(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.filename)}"`,
    );
    res.send(file.buffer);
  }

  @Get(':id/report')
  async report(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.imports.buildReport(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="import-report-${id}.xlsx"`);
    res.send(buffer);
  }

  @Get(':id/export')
  async exportQuestions(@Param('id') id: string, @Res() res: Response) {
    const file = await this.imports.exportBatchQuestions(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.filename)}"`,
    );
    res.send(file.buffer);
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
}
