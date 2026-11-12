import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { createSuccessResponse } from '@your-academy/shared';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import type { RequestUser } from '../auth/auth.types';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { newRequestId } from '../common/request-id';
import { StorageService } from '../storage/storage.service';
import { CreateGuestSessionDto } from './dto/create-guest-session.dto';
import { SendSupportMessageDto } from './dto/send-message.dto';
import { resolveSupportActor } from './support-actor.util';
import { SupportConversationService } from './support-conversation.service';
import { SupportGuestService } from './support-guest.service';
import { SupportMessageService } from './support-message.service';

@Controller('api/v1/support')
export class SupportController {
  constructor(
    private readonly guests: SupportGuestService,
    private readonly conversations: SupportConversationService,
    private readonly messages: SupportMessageService,
    private readonly storage: StorageService,
  ) {}

  @Post('guest/session')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createGuest(@Body() dto: CreateGuestSessionDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.guests.createSession(dto, res);
    return createSuccessResponse(data, newRequestId());
  }

  @Get('guest/me')
  async guestMe(@Req() req: Request) {
    const guest = await this.guests.resolveFromRequest(req);
    return createSuccessResponse(
      guest && guest.kind === 'guest'
        ? {
            id: guest.guestSessionId,
            name: guest.name,
            whatsappNumber: guest.whatsappNumber,
          }
        : null,
      newRequestId(),
    );
  }

  @Get('unread')
  @UseGuards(OptionalJwtAuthGuard)
  async unread(@Req() req: Request & { user?: RequestUser }) {
    const actor = await resolveSupportActor(req, this.guests);
    return createSuccessResponse(await this.conversations.unreadForActor(actor), newRequestId());
  }

  @Get('conversations/mine')
  @UseGuards(OptionalJwtAuthGuard)
  async mine(@Req() req: Request & { user?: RequestUser }) {
    const actor = await resolveSupportActor(req, this.guests);
    return createSuccessResponse(await this.conversations.getOrCreateMine(actor), newRequestId());
  }

  @Get('conversations/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getOne(
    @Req() req: Request & { user?: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = await resolveSupportActor(req, this.guests);
    return createSuccessResponse(await this.conversations.getByIdForActor(actor, id), newRequestId());
  }

  @Get('conversations/:id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  async listMessages(
    @Req() req: Request & { user?: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = await resolveSupportActor(req, this.guests);
    const data = await this.messages.listMessages(
      actor,
      id,
      cursor,
      limit ? Number(limit) : undefined,
    );
    return createSuccessResponse(data.items, newRequestId(), data.meta);
  }

  @Post('conversations/:id/messages')
  @UseGuards(OptionalJwtAuthGuard, CsrfGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async send(
    @Req() req: Request & { user?: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendSupportMessageDto,
  ) {
    const actor = await resolveSupportActor(req, this.guests);
    const message = await this.messages.sendMessage(actor, id, dto);
    return createSuccessResponse(message, newRequestId());
  }

  @Post('conversations/:id/read')
  @UseGuards(OptionalJwtAuthGuard, CsrfGuard)
  async markRead(
    @Req() req: Request & { user?: RequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = await resolveSupportActor(req, this.guests);
    return createSuccessResponse(await this.messages.markRead(actor, id), newRequestId());
  }

  @Post('uploads/sign')
  @UseGuards(OptionalJwtAuthGuard, CsrfGuard)
  async signUpload(@Req() req: Request & { user?: RequestUser }) {
    const actor = await resolveSupportActor(req, this.guests);
    if (actor.kind === 'guest') {
      return createSuccessResponse(
        this.storage.createGuestSupportUploadParams(actor.guestSessionId),
        newRequestId(),
      );
    }
    return createSuccessResponse(
      this.storage.createSignedUploadParams('support-attachment', {
        userId: actor.userId,
        role: actor.role,
        sessionId: actor.sessionId,
      }),
      newRequestId(),
    );
  }

  @Post('uploads/confirm')
  @UseGuards(OptionalJwtAuthGuard, CsrfGuard)
  async confirmUpload(
    @Req() req: Request & { user?: RequestUser },
    @Body()
    body: {
      publicId: string;
      resourceType?: 'image' | 'raw';
      bytes?: number;
      mimeType?: string;
      format?: string;
      width?: number;
      height?: number;
      originalFilename?: string;
    },
  ) {
    const actor = await resolveSupportActor(req, this.guests);
    if (actor.kind === 'guest') {
      const asset = await this.storage.confirmGuestSupportUpload(actor.guestSessionId, {
        purpose: 'support-attachment',
        ...body,
      });
      return createSuccessResponse(asset, newRequestId());
    }
    const asset = await this.storage.confirmUpload(
      { userId: actor.userId, role: actor.role, sessionId: actor.sessionId },
      { purpose: 'support-attachment', ...body },
    );
    return createSuccessResponse(asset, newRequestId());
  }
}
