import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createSuccessResponse } from '@your-academy/shared';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { SupportGuestService } from '../support/support-guest.service';
import { AuthService } from './auth.service';
import type { RequestUser } from './auth.types';
import { CookieService } from './cookie.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: CookieService,
    private readonly supportGuests: SupportGuestService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(dto);
    this.cookies.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      csrfToken: result.csrfToken,
    });
    await this.supportGuests.linkGuestToUser(result.user.id, result.user.whatsappNumber, res);
    return createSuccessResponse(
      { user: await this.auth.toPublicUser(result.user) },
      newRequestId(),
    );
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    this.cookies.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      csrfToken: result.csrfToken,
    });
    await this.supportGuests.linkGuestToUser(result.user.id, result.user.whatsappNumber, res);
    return createSuccessResponse(
      { user: await this.auth.toPublicUser(result.user) },
      newRequestId(),
    );
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const name = process.env.REFRESH_COOKIE_NAME ?? 'refresh_token';
    const result = await this.auth.refresh(req.cookies?.[name]);
    this.cookies.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      csrfToken: result.csrfToken,
    });
    return createSuccessResponse(
      { user: await this.auth.toPublicUser(result.user) },
      newRequestId(),
    );
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(user);
    this.cookies.clearAuthCookies(res);
    return createSuccessResponse({ ok: true }, newRequestId());
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, CsrfGuard)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.changePassword(user, dto);
    this.cookies.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      csrfToken: result.csrfToken,
    });
    return createSuccessResponse(
      { user: await this.auth.toPublicUser(result.user) },
      newRequestId(),
    );
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.auth.forgotPassword(dto);
    return createSuccessResponse(data, newRequestId());
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.auth.resetPassword(dto);
    return createSuccessResponse(data, newRequestId());
  }
}
