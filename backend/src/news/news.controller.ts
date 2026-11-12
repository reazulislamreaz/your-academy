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
import { createSuccessResponse, cursorPaginationMeta } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { parseLimit } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import { CreateNewsDto, UpdateNewsDto } from './dto/create-news.dto';
import { NewsService } from './news.service';

@Controller('api/v1')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get('news')
  async list(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const take = parseLimit(limit, 20);
    const data = await this.news.listPublished({ cursor, limit: take });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('news/:slug')
  async detail(@Param('slug') slug: string) {
    return createSuccessResponse(await this.news.getBySlug(slug), newRequestId());
  }

  @Get('admin/news')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminList(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const take = parseLimit(limit, 50);
    const data = await this.news.adminList({ cursor, limit: take });
    return createSuccessResponse(
      data.items,
      newRequestId(),
      cursorPaginationMeta(data.nextCursor, take),
    );
  }

  @Get('admin/news/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGet(@Param('id') id: string) {
    return createSuccessResponse(await this.news.adminGet(id), newRequestId());
  }

  @Post('admin/news')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async create(@CurrentUser() user: RequestUser, @Body() body: CreateNewsDto) {
    return createSuccessResponse(await this.news.create(user, body), newRequestId());
  }

  @Patch('admin/news/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() body: UpdateNewsDto) {
    return createSuccessResponse(await this.news.update(id, body), newRequestId());
  }

  @Post('admin/news/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async publish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.news.publish(id, user.userId), newRequestId());
  }

  @Post('admin/news/:id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async unpublish(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.news.unpublish(id, user.userId), newRequestId());
  }

  @Delete('admin/news/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(await this.news.softDelete(id, user.userId), newRequestId());
  }
}
