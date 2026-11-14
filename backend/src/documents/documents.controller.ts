import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { Response } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { parseLimit } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';
import { DocumentsService } from './documents.service';

@Controller('api/v1')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  async list(
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const take = parseLimit(limit, 20);
    const data = await this.documents.listPublished(user, {
      cursor,
      limit: take,
      categoryId,
    });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('documents/:id')
  @UseGuards(JwtAuthGuard)
  async detail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.documents.getPublished(id, user), newRequestId());
  }

  /**
   * In-app PDF bytes for authenticated learners (DEC-033).
   * Inline only — never returns a Cloudinary download URL.
   */
  @Get('documents/:id/file')
  @UseGuards(JwtAuthGuard)
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, max-age=60, no-transform')
  @Header('Content-Disposition', 'inline')
  async streamDocument(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.documents.getAuthenticatedPdfBytes(id, user);
    const type = file.contentType.toLowerCase().includes('pdf')
      ? 'application/pdf'
      : file.contentType;
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', String(file.buffer.length));
    res.send(file.buffer);
  }

  @Get('admin/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminList(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const take = parseLimit(limit, 50);
    const data = await this.documents.adminList({ cursor, limit: take });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('admin/documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGet(@Param('id') id: string) {
    return createSuccessResponse(await this.documents.adminGet(id), newRequestId());
  }

  @Post('admin/documents')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateDocumentDto) {
    return createSuccessResponse(await this.documents.create(user, dto), newRequestId());
  }

  @Patch('admin/documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return createSuccessResponse(await this.documents.update(id, dto, user), newRequestId());
  }

  @Delete('admin/documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.documents.softDelete(id, user.userId), newRequestId());
  }
}
