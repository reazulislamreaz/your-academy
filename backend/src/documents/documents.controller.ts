import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';
import { DocumentsService } from './documents.service';

@Controller('api/v1')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  async list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const data = await this.documents.listPublished({
      cursor,
      limit: limit ? Number(limit) : undefined,
      categoryId,
    });
    return createSuccessResponse(data.items, newRequestId(), {
      nextCursor: data.nextCursor,
      prevCursor: null,
      limit: limit ? Number(limit) : 20,
      total: null,
    });
  }

  @Get('documents/:id')
  @UseGuards(JwtAuthGuard)
  async detail(@Param('id') id: string) {
    return createSuccessResponse(await this.documents.getPublished(id), newRequestId());
  }

  @Get('admin/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminList() {
    return createSuccessResponse(await this.documents.adminList(), newRequestId());
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
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return createSuccessResponse(await this.documents.update(id, dto), newRequestId());
  }

  @Delete('admin/documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return createSuccessResponse(await this.documents.softDelete(id), newRequestId());
  }
}
