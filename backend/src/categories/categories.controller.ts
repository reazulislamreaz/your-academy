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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('api/v1')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Public: active category tree for marketing + filters (question content remains auth-gated). */
  @Get('categories')
  async list() {
    return createSuccessResponse(await this.categories.listActive(), newRequestId());
  }

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listAdmin() {
    return createSuccessResponse(await this.categories.listAdmin(), newRequestId());
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateCategoryDto) {
    return createSuccessResponse(await this.categories.create(dto), newRequestId());
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return createSuccessResponse(await this.categories.update(id, dto), newRequestId());
  }

  @Post('admin/categories/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async activate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(
      await this.categories.activate(id, user.userId),
      newRequestId(),
    );
  }

  @Post('admin/categories/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async deactivate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(
      await this.categories.deactivate(id, user.userId),
      newRequestId(),
    );
  }

  /**
   * Soft-delete (deactivate) by default. Pass `?hard=true` to permanently delete
   * only when the category is unused.
   */
  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('hard') hard?: string,
  ) {
    return createSuccessResponse(
      await this.categories.remove(id, user.userId, hard === 'true' || hard === '1'),
      newRequestId(),
    );
  }
}
