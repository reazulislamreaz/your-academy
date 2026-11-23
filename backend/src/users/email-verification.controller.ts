import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createSuccessResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailVerificationService } from './email-verification.service';

@Controller('api/v1')
export class EmailVerificationController {
  constructor(private readonly verification: EmailVerificationService) {}

  /** Re-send the confirmation link for the signed-in user's own email. */
  @Post('users/me/email/verification')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async resend(@CurrentUser() user: RequestUser) {
    return createSuccessResponse(
      await this.verification.sendForCurrentEmail(user.userId),
      newRequestId(),
    );
  }

  /** Public: the token in the emailed link is the proof (works signed out). */
  @Post('auth/verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verify(@Body() body: VerifyEmailDto) {
    return createSuccessResponse(await this.verification.verify(body.token), newRequestId());
  }
}
