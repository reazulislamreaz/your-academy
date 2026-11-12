import { Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserRole, UserStatus } from '@prisma/client';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, Socket } from 'socket.io';
import IORedis from 'ioredis';
import { getJwtAccessSecret, getWebOrigins } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CONNECTION } from '../queue/queue.module';
import type { JwtPayload } from '../auth/auth.types';
import { SupportConversationService } from './support-conversation.service';
import { SupportGuestService } from './support-guest.service';
import { SupportMessageService } from './support-message.service';
import { SupportPresenceService } from './support-presence.service';
import { SUPPORT_GUEST_COOKIE, type SupportActor } from './support.types';
import { isAdminActor } from './support-actor.util';

type AuthedSocket = Socket & { supportActor?: SupportActor };

@WebSocketGateway({
  namespace: '/support',
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      const origins = getWebOrigins();
      if (!origin || origins.includes(origin)) cb(null, true);
      else cb(null, false);
    },
    credentials: true,
  },
})
export class SupportGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SupportGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly guests: SupportGuestService,
    private readonly conversations: SupportConversationService,
    private readonly messages: SupportMessageService,
    private readonly presence: SupportPresenceService,
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
  ) {}

  afterInit() {
    try {
      // Nest injects the `/support` Namespace; Redis adapter must be set on the root Server.
      const root =
        (this.server as unknown as { server?: Server }).server ?? this.server;
      if (typeof (root as { adapter?: unknown }).adapter !== 'function') {
        this.logger.warn('Socket.IO root adapter setter unavailable; using in-memory');
        return;
      }
      const pub = this.redis.duplicate();
      const sub = this.redis.duplicate();
      (root as Server).adapter(createAdapter(pub, sub) as never);
      this.logger.log('Socket.IO Redis adapter attached for /support');
    } catch (err) {
      this.logger.warn(`Redis adapter unavailable, using in-memory: ${String(err)}`);
    }
  }

  private parseCookies(cookieHeader?: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (!k) continue;
      out[k] = decodeURIComponent(rest.join('=') ?? '');
    }
    return out;
  }

  private async authenticate(client: AuthedSocket): Promise<SupportActor | null> {
    const cookies = this.parseCookies(client.handshake.headers.cookie);
    const accessName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    const bearer = client.handshake.auth?.token as string | undefined;
    const token =
      bearer ||
      (typeof client.handshake.headers.authorization === 'string' &&
      client.handshake.headers.authorization.startsWith('Bearer ')
        ? client.handshake.headers.authorization.slice(7)
        : null) ||
      cookies[accessName] ||
      null;

    if (token) {
      try {
        const payload = this.jwt.verify<JwtPayload>(token, { secret: getJwtAccessSecret() });
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        const session = await this.prisma.authSession.findUnique({ where: { id: payload.sid } });
        if (
          user &&
          user.status === UserStatus.ACTIVE &&
          !user.deletedAt &&
          session &&
          !session.revokedAt &&
          session.expiresAt > new Date()
        ) {
          return { kind: 'user', userId: user.id, role: user.role, sessionId: session.id };
        }
      } catch {
        /* fall through to guest */
      }
    }

    const guestToken = cookies[SUPPORT_GUEST_COOKIE];
    if (guestToken) return this.guests.resolveFromToken(guestToken);
    return null;
  }

  async handleConnection(client: AuthedSocket) {
    const actor = await this.authenticate(client);
    if (!actor) {
      client.emit('support:error', { code: 'UNAUTHORIZED', message: 'Auth required' });
      client.disconnect(true);
      return;
    }
    client.supportActor = actor;
    if (actor.kind === 'user') {
      await client.join(`user:${actor.userId}`);
      if (actor.role === UserRole.ADMIN) await client.join('admin:support');
      this.presence.markOnline(
        { kind: actor.role === UserRole.ADMIN ? 'admin' : 'user', id: actor.userId },
        client.id,
      );
    } else {
      await client.join(`guest:${actor.guestSessionId}`);
      this.presence.markOnline({ kind: 'guest', id: actor.guestSessionId }, client.id);
    }
    const unread = await this.conversations.unreadForActor(actor);
    client.emit('support:unread', unread);
  }

  handleDisconnect(client: AuthedSocket) {
    const actor = client.supportActor;
    if (!actor) return;
    if (actor.kind === 'user') {
      this.presence.markOffline(
        { kind: actor.role === UserRole.ADMIN ? 'admin' : 'user', id: actor.userId },
        client.id,
      );
    } else {
      this.presence.markOffline({ kind: 'guest', id: actor.guestSessionId }, client.id);
    }
  }

  @SubscribeMessage('support:join')
  async onJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const actor = client.supportActor;
    if (!actor || !body?.conversationId) return { ok: false };
    await this.conversations.requireAccessible(actor, body.conversationId);
    await client.join(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('support:leave')
  async onLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    if (!body?.conversationId) return { ok: false };
    await client.leave(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  @SubscribeMessage('support:message:send')
  async onSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody()
    body: {
      conversationId?: string;
      body?: string;
      clientMessageId?: string;
      mediaAssetId?: string;
      originalFilename?: string;
    },
  ) {
    const actor = client.supportActor;
    if (!actor || !body?.conversationId) return { ok: false };
    try {
      const message = await this.messages.sendMessage(actor, body.conversationId, body);
      const conv = await this.conversations.requireAccessible(actor, body.conversationId);
      this.server.to(`conversation:${body.conversationId}`).emit('support:message:new', message);
      this.server.to('admin:support').emit('support:conversation:updated', {
        conversationId: body.conversationId,
      });
      if (conv.userId) {
        this.server.to(`user:${conv.userId}`).emit('support:message:new', message);
        this.server.to(`user:${conv.userId}`).emit('support:unread', { bump: true });
      }
      if (conv.guestSessionId) {
        this.server.to(`guest:${conv.guestSessionId}`).emit('support:message:new', message);
        this.server.to(`guest:${conv.guestSessionId}`).emit('support:unread', { bump: true });
      }
      if (!(actor.kind === 'user' && actor.role === UserRole.ADMIN)) {
        this.server.to('admin:support').emit('support:unread', { bump: true });
      }
      client.emit('support:message:ack', {
        clientMessageId: body.clientMessageId,
        message,
      });
      return { ok: true, message };
    } catch (err) {
      this.logger.warn(`support:message:send failed: ${String(err)}`);
      return { ok: false, error: 'SEND_FAILED' };
    }
  }

  @SubscribeMessage('support:message:read')
  async onRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const actor = client.supportActor;
    if (!actor || !body?.conversationId) return { ok: false };
    const result = await this.messages.markRead(actor, body.conversationId);
    this.server
      .to(`conversation:${body.conversationId}`)
      .emit('support:message:read', { conversationId: body.conversationId, ...result });
    return { ok: true };
  }

  @SubscribeMessage('support:typing')
  async onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string; typing?: boolean },
  ) {
    const actor = client.supportActor;
    if (!actor || !body?.conversationId) return { ok: false };
    await this.conversations.requireAccessible(actor, body.conversationId);
    client.to(`conversation:${body.conversationId}`).emit('support:typing', {
      conversationId: body.conversationId,
      typing: Boolean(body.typing),
      actorKind: isAdminActor(actor) ? 'admin' : actor.kind,
    });
    return { ok: true };
  }
}
