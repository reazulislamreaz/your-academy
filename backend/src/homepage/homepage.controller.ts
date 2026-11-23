import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { UpdateHomepageDraftDto } from './dto/update-homepage-draft.dto';
import { HomepageService } from './homepage.service';

@Controller('api/v1')
export class HomepageController {
  constructor(private readonly homepage: HomepageService) {}

  /**
   * Published homepage for marketing site (DEC-038).
   * Next.js owns ISR via `tags: ['homepage']` + on-demand revalidate after publish.
   * Do not use shared CDN s-maxage here — it can serve stale CMS payloads after publish.
   */
  @Get('public/homepage')
  @Header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  async publicHomepage() {
    return createSuccessResponse(await this.homepage.getPublishedPublic(), newRequestId());
  }

  @Get('admin/homepage')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('homepage')
  async adminGet() {
    return createSuccessResponse(await this.homepage.getAdmin(), newRequestId());
  }

  @Get('admin/homepage/revisions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('homepage')
  async listRevisions(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 20;
    return createSuccessResponse(
      await this.homepage.listRevisions(Number.isFinite(n) ? n : 20),
      newRequestId(),
    );
  }

  @Put('admin/homepage/draft')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('homepage')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('homepage')
  async publish(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.homepage.publish(user), newRequestId());
  }

  @Post('admin/homepage/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('homepage')
  async restore(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(await this.homepage.restore(user), newRequestId());
  }

  @Post('admin/homepage/revisions/:id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard, CsrfGuard)
  @RequirePermission('homepage')
  async restoreRevision(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return createSuccessResponse(
      await this.homepage.restoreRevision(user, id),
      newRequestId(),
    );
  }
}
