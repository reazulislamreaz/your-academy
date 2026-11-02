import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { StorageService } from './storage.service';

@Controller('api/v1/storage')
@UseGuards(JwtAuthGuard, CsrfGuard)
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('sign-upload')
  sign(@CurrentUser() user: RequestUser, @Body() body: { purpose: string }) {
    return createSuccessResponse(
      this.storage.createSignedUploadParams(body.purpose || 'misc', user.userId),
      newRequestId(),
    );
  }
}
