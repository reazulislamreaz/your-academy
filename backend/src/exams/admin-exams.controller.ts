import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
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
import { UpdateExamGuideDto } from './dto/update-exam-guide.dto';
import { ExamsService } from './exams.service';

@Controller('api/v1/admin/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
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
  async list() {
    return createSuccessResponse(await this.exams.listAdmin(), newRequestId());
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
}
