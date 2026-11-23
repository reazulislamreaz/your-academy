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
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { newRequestId } from '../common/request-id';
import { CategoriesService } from './categories.service';
import { parseCategoryScope } from './category-scope';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('api/v1')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /**
   * Public: active category tree for marketing + filters.
   * Default scope=PRELIMINARY (Preli bank). Pass `?scope=WRITTEN` for Written bank filters.
   */
  @Get('categories')
  async list(@Query('scope') scope?: string) {
    return createSuccessResponse(
      await this.categories.listActive(parseCategoryScope(scope)),
      newRequestId(),
    );
  }

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('categories')
  async listAdmin(@Query('scope') scope?: string) {
    return createSuccessResponse(
      await this.categories.listAdmin(parseCategoryScope(scope)),
      newRequestId(),
    );
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('categories')
  async create(@Body() dto: CreateCategoryDto) {
    return createSuccessResponse(await this.categories.create(dto), newRequestId());
  }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('categories')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return createSuccessResponse(await this.categories.update(id, dto), newRequestId());
  }

  @Post('admin/categories/:id/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('categories')
  async activate(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return createSuccessResponse(
      await this.categories.activate(id, user.userId),
      newRequestId(),
    );
  }

  @Post('admin/categories/:id/deactivate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('categories')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('categories')
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
