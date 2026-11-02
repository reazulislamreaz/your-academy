import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('api/v1')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Public: category names/tree for marketing + filters (question content remains auth-gated). */
  @Get('categories')
  async list() {
    return createSuccessResponse(await this.categories.listActive(), newRequestId());
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
  async update(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return createSuccessResponse(await this.categories.update(id, dto), newRequestId());
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return createSuccessResponse(await this.categories.deactivate(id), newRequestId());
  }
}
