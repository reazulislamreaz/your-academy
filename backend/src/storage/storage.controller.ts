import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { SignUploadDto } from './dto/sign-upload.dto';
import { StorageService } from './storage.service';

@Controller('api/v1/storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('status')
  status() {
    return createSuccessResponse(
      { configured: this.storage.isConfigured() },
      newRequestId(),
    );
  }

  @Post('sign-upload')
  @UseGuards(CsrfGuard)
  sign(@CurrentUser() user: RequestUser, @Body() body: SignUploadDto) {
    return createSuccessResponse(
      this.storage.createSignedUploadParams(body.purpose, user),
      newRequestId(),
    );
  }

  @Post('confirm')
  @UseGuards(CsrfGuard)
  async confirm(@CurrentUser() user: RequestUser, @Body() body: ConfirmUploadDto) {
    return createSuccessResponse(await this.storage.confirmUpload(user, body), newRequestId());
  }
}
