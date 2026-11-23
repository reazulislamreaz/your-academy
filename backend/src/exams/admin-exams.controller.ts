import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
import { parseLimit } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import { UpdateExamGuideDto } from './dto/update-exam-guide.dto';
import { UpdateExamDto, UpdateExamQuestionDto } from './dto/update-exam.dto';
import { ExamsService } from './exams.service';

@Controller('api/v1/admin/exams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('quiz')
export class AdminExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get('template')
  async template(@Res() res: Response) {
    const buffer = await this.exams.getTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="your-academy-exam-template-7col.xlsx"',
    );
    res.send(buffer);
  }

  @Get()
  async list(@Query('cursor') cursor?: string, @Query('limit') limitRaw?: string) {
    const take = parseLimit(limitRaw, 20);
    const page = await this.exams.listAdmin({ cursor, limit: take });
    return createSuccessResponse(
      page.items,
      newRequestId(),
      cursorPaginationMeta(page.nextCursor, take),
    );
  }

  @Get('guide')
  async getGuide() {
    return createSuccessResponse(await this.exams.getGuide(), newRequestId());
  }

  @Put('guide')
  @UseGuards(CsrfGuard)
  async updateGuide(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateExamGuideDto,
  ) {
    return createSuccessResponse(
      await this.exams.updateGuide(dto, user.userId),
      newRequestId(),
    );
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
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('durationInMinutes') durationInMinutes?: string,
  ) {
    const duration = Number(durationInMinutes);
    const data = await this.exams.createFromUpload({
      title: title ?? '',
      description,
      durationInMinutes: duration,
      file,
      createdById: user.userId,
    });
    return createSuccessResponse(data, newRequestId());
  }

  // `:id` routes stay below the static `template` / `guide` routes so they never shadow them.
  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.exams.getAdminDetail(id), newRequestId());
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExamDto) {
    return createSuccessResponse(await this.exams.updateMeta(id, dto), newRequestId());
  }

  @Patch(':id/questions/:questionId')
  @UseGuards(CsrfGuard)
  async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateExamQuestionDto,
  ) {
    return createSuccessResponse(
      await this.exams.updateQuestion(id, questionId, dto),
      newRequestId(),
    );
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.exams.remove(id), newRequestId());
  }
}
