import { Body, Controller, Get, Header, Post, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import { UpdateHomepageDraftDto } from './dto/update-homepage-draft.dto';
import { HomepageService } from './homepage.service';

@Controller('api/v1')
export class HomepageController {
  constructor(private readonly homepage: HomepageService) {}

  /** Published homepage for marketing site (DEC-038). */
  @Get('public/homepage')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  async publicHomepage() {
    return createSuccessResponse(await this.homepage.getPublishedPublic(), newRequestId());
  }

  @Get('admin/homepage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminGet() {
    return createSuccessResponse(await this.homepage.getAdmin(), newRequestId());
  }

  @Put('admin/homepage/draft')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async saveDraft(@CurrentUser() user: RequestUser, @Body() body: UpdateHomepageDraftDto) {
    return createSuccessResponse(
      await this.homepage.updateDraft(user, {
        payload: body.payload,
        heroImageAssetId: body.heroImageAssetId,
      }),
      newRequestId(),
    );
  }

  @Post('admin/homepage/publish')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async publish(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.homepage.publish(user), newRequestId());
  }

  @Post('admin/homepage/restore')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async restore(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.homepage.restore(user), newRequestId());
  }
}
