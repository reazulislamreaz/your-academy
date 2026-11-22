import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import {
  CreateSocialLinkDto,
  ReorderSocialLinksDto,
  UpdateSocialLinkDto,
} from './dto/create-social-link.dto';
import { SocialLinksService } from './social-links.service';

@Controller('api/v1')
export class SocialLinksController {
  constructor(private readonly socialLinks: SocialLinksService) {}

  /** Enabled footer socials for the marketing site (DEC-046). */
  @Get('public/social-links')
  @Header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  async listPublic() {
    return createSuccessResponse(await this.socialLinks.listPublic(), newRequestId());
  }

  @Get('admin/social-links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listAdmin() {
    return createSuccessResponse(await this.socialLinks.listAdmin(), newRequestId());
  }

  @Post('admin/social-links')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() body: CreateSocialLinkDto) {
    return createSuccessResponse(await this.socialLinks.create(body), newRequestId());
  }

  /** Declare before `:id` routes so Nest never treats `reorder` as a UUID. */
  @Put('admin/social-links/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async reorder(@Body() body: ReorderSocialLinksDto) {
    return createSuccessResponse(await this.socialLinks.reorder(body.orderedIds), newRequestId());
  }

  @Patch('admin/social-links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateSocialLinkDto) {
    return createSuccessResponse(await this.socialLinks.update(id, body), newRequestId());
  }

  @Delete('admin/social-links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.socialLinks.remove(id), newRequestId());
  }
}
