import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { TopicImportService } from './topic-import.service';

@Controller('api/v1/admin/topic-question-imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
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
  async list() {
    return createSuccessResponse(await this.imports.listBatches(), newRequestId());
  }

  @Get('stats')
  async stats() {
    return createSuccessResponse(await this.imports.getStats(), newRequestId());
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return createSuccessResponse(await this.imports.getBatch(id), newRequestId());
  }

  @Post('upload')
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
