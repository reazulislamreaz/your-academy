import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { NewsService } from './news.service';

@Controller('api/v1')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get('news')
  async list() {
    return createSuccessResponse(await this.news.listPublished(), newRequestId());
  }

  @Get('news/:slug')
  async detail(@Param('slug') slug: string) {
    return createSuccessResponse(await this.news.getBySlug(slug), newRequestId());
  }

  @Post('admin/news')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: { title: string; slug: string; summary?: string; body: string },
  ) {
    return createSuccessResponse(await this.news.create(user, body), newRequestId());
  }

  @Post('admin/news/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async publish(@Param('id') id: string) {
    return createSuccessResponse(await this.news.publish(id), newRequestId());
  }
}
