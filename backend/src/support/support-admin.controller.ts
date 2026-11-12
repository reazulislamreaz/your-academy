import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createSuccessResponse } from '@your-academy/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { newRequestId } from '../common/request-id';
import type { RequestUser } from '../auth/auth.types';
import {
  AdminConversationQueryDto,
  CreateInternalNoteDto,
  UpdateSupportConversationDto,
} from './dto/admin-conversation.dto';
import { SendSupportMessageDto } from './dto/send-message.dto';
import { SupportConversationService } from './support-conversation.service';
import { SupportMessageService } from './support-message.service';
import { SupportPresenceService } from './support-presence.service';

@Controller('api/v1/admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SupportAdminController {
  constructor(
    private readonly conversations: SupportConversationService,
    private readonly messages: SupportMessageService,
    private readonly presence: SupportPresenceService,
  ) {}

  @Get('conversations')
  async list(@Query() query: AdminConversationQueryDto) {
    const data = await this.conversations.listAdmin({
      q: query.q,
      status: query.status,
      filter: query.filter,
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    const items = data.items.map((c) => {
      const actor = c.userId
        ? ({ kind: 'user' as const, id: c.userId })
        : c.guestSessionId
          ? ({ kind: 'guest' as const, id: c.guestSessionId })
          : null;
      if (!actor) return c;
      return {
        ...c,
        participantOnline: this.presence.isOnline(actor),
        participantLastSeenAt: this.presence.lastSeen(actor)?.toISOString() ?? null,
      };
    });
    return createSuccessResponse(items, newRequestId(), data.meta);
  }

  @Get('conversations/:id')
  async getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    const actor = { kind: 'user' as const, userId: user.userId, role: user.role, sessionId: user.sessionId };
    return createSuccessResponse(await this.conversations.getByIdForActor(actor, id), newRequestId());
  }

  @Patch('conversations/:id')
  @UseGuards(CsrfGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupportConversationDto,
  ) {
    return createSuccessResponse(await this.conversations.updateAdmin(id, dto), newRequestId());
  }

  @Get('conversations/:id/messages')
  async messagesList(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const actor = { kind: 'user' as const, userId: user.userId, role: user.role, sessionId: user.sessionId };
    const data = await this.messages.listMessages(actor, id, cursor, limit ? Number(limit) : undefined);
    return createSuccessResponse(data.items, newRequestId(), data.meta);
  }

  @Post('conversations/:id/messages')
  @UseGuards(CsrfGuard)
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: SendSupportMessageDto,
  ) {
    const actor = { kind: 'user' as const, userId: user.userId, role: user.role, sessionId: user.sessionId };
    return createSuccessResponse(await this.messages.sendMessage(actor, id, dto), newRequestId());
  }

  @Post('conversations/:id/read')
  @UseGuards(CsrfGuard)
  async markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    const actor = { kind: 'user' as const, userId: user.userId, role: user.role, sessionId: user.sessionId };
    return createSuccessResponse(await this.messages.markRead(actor, id), newRequestId());
  }

  @Get('conversations/:id/notes')
  async notes(@Param('id', ParseUUIDPipe) id: string) {
    return createSuccessResponse(await this.messages.listNotes(id), newRequestId());
  }

  @Post('conversations/:id/notes')
  @UseGuards(CsrfGuard)
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInternalNoteDto,
  ) {
    return createSuccessResponse(await this.messages.addNote(user.userId, id, dto.body), newRequestId());
  }

  @Get('presence')
  presenceSnapshot() {
    return createSuccessResponse(this.presence.snapshot(), newRequestId());
  }
}
