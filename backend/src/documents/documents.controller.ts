import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
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
}
