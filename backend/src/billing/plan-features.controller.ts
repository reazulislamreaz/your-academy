import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import {
  CreatePlanFeatureDto,
  ReorderPlanFeaturesDto,
  UpdatePlanFeatureDto,
} from './dto/billing.dto';
import { PlanFeaturesService } from './plan-features.service';

/** DEC-065 — homepage Free vs Paid cards (public, no-cache so admin edits show at once). */
@Controller('api/v1/public')
export class PublicPlanFeaturesController {
  constructor(private readonly features: PlanFeaturesService) {}

  @Get('plan-comparison')
  @Header('Cache-Control', 'no-cache')
  async comparison() {
    return createSuccessResponse(await this.features.comparison(), newRequestId());
  }
}

/** DEC-065 — Admin → Pricing & Plan Features (`subscriptions` permission = Admin only). */
@Controller('api/v1/admin/plan-features')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('subscriptions')
export class AdminPlanFeaturesController {
  constructor(private readonly features: PlanFeaturesService) {}

  @Get()
  async list() {
    return createSuccessResponse(await this.features.listAdmin(), newRequestId());
  }

  @Post()
  @UseGuards(CsrfGuard)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreatePlanFeatureDto) {
    return createSuccessResponse(await this.features.create(dto, user.userId), newRequestId());
  }

  /** Declared before `:id` so "reorder" is never read as an id. */
  @Post('reorder')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async reorder(@CurrentUser() user: RequestUser, @Body() dto: ReorderPlanFeaturesDto) {
    return createSuccessResponse(
      await this.features.reorder(dto.planKey, dto.ids, user.userId),
      newRequestId(),
    );
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanFeatureDto,
  ) {
    return createSuccessResponse(await this.features.update(id, dto, user.userId), newRequestId());
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  async remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.features.remove(id, user.userId), newRequestId());
  }
}
