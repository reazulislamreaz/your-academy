import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentAccess } from '@prisma/client';
import {
  createErrorResponse,
  createSuccessResponse,
  cursorPaginationMeta,
} from '@your-academy/shared';
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
import { UpdateModelTestGuideDto } from './dto/update-model-test-guide.dto';
import { ModelTestsService } from './model-tests.service';

/** DEC-060 — Free / Paid toggle value (allowlisted). */
function parseAccess(raw: unknown): ContentAccess | undefined {
  const v = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return v === ContentAccess.FREE || v === ContentAccess.PAID ? v : undefined;
}

@Controller('api/v1/admin/model-tests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('modelTest')
export class AdminModelTestsController {
  constructor(private readonly modelTests: ModelTestsService) {}

  @Get('template')
  async template(@Res() res: Response) {
    const buffer = await this.modelTests.getTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="your-academy-model-test-template-7col.xlsx"',
    );
    res.send(buffer);
  }

  @Get()
  async list(@Query('cursor') cursor?: string, @Query('limit') limitRaw?: string) {
    const take = parseLimit(limitRaw, 20);
    const page = await this.modelTests.listAdmin({ cursor, limit: take });
    return createSuccessResponse(
      page.items,
      newRequestId(),
      cursorPaginationMeta(page.nextCursor, take),
    );
  }

  @Get('categories')
  async listCategories() {
    return createSuccessResponse(await this.modelTests.listCategories(), newRequestId());
  }

  @Get('guide')
  async getGuide() {
    return createSuccessResponse(await this.modelTests.getGuide(), newRequestId());
  }

  @Put('guide')
  @UseGuards(CsrfGuard)
  async updateGuide(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateModelTestGuideDto,
  ) {
    return createSuccessResponse(
      await this.modelTests.updateGuide(dto, user.userId),
      newRequestId(),
    );
  }

  @Post('categories')
  @UseGuards(CsrfGuard)
  async createCategory(@Body('name') name?: string) {
    return createSuccessResponse(
      await this.modelTests.createCategory(name ?? ''),
      newRequestId(),
    );
  }

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
    @Body('examYear') examYear?: string,
    @Body('categoryId') categoryId?: string,
    @Body('isPublished') isPublished?: string,
    @Body('access') access?: string,
  ) {
    const duration = Number(durationInMinutes);
    const yearRaw = examYear?.trim() ? Number(examYear) : null;
    const published =
      isPublished == null || isPublished === ''
        ? true
        : !['false', '0', 'no'].includes(String(isPublished).toLowerCase());

    const data = await this.modelTests.createFromUpload({
      title: title ?? '',
      description,
      durationInMinutes: duration,
      examYear: yearRaw != null && Number.isFinite(yearRaw) ? yearRaw : null,
      categoryId: categoryId?.trim() || null,
      isPublished: published,
      access: parseAccess(access) ?? ContentAccess.FREE,
      file,
      createdById: user.userId,
    });
    return createSuccessResponse(data, newRequestId());
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string | null;
      durationInMinutes?: number;
      examYear?: number | null;
      categoryId?: string | null;
      isPublished?: boolean;
      access?: string;
    },
  ) {
    const access = body.access === undefined ? undefined : parseAccess(body.access);
    if (body.access !== undefined && !access) {
      throw new BadRequestException(
        createErrorResponse('INVALID_ACCESS', 'access must be FREE or PAID', newRequestId()),
      );
    }
    const hasMeta =
      body.title !== undefined ||
      body.description !== undefined ||
      body.durationInMinutes !== undefined ||
      body.examYear !== undefined ||
      body.categoryId !== undefined ||
      access !== undefined;

    if (typeof body.isPublished === 'boolean' && !hasMeta) {
      const data = await this.modelTests.setPublished(id, body.isPublished);
      return createSuccessResponse(data, newRequestId());
    }

    if (typeof body.isPublished === 'boolean') {
      await this.modelTests.setPublished(id, body.isPublished);
    }

    const data = await this.modelTests.updateMeta(id, {
      title: body.title,
      description: body.description,
      durationInMinutes: body.durationInMinutes,
      examYear: body.examYear,
      categoryId: body.categoryId,
      access,
    });
    return createSuccessResponse(data, newRequestId());
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  async remove(@Param('id') id: string) {
    return createSuccessResponse(await this.modelTests.remove(id), newRequestId());
  }
}
