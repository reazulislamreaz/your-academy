import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { Request, Response } from 'express';
import { randomToken, sha256 } from '../common/utils/crypto';
import { isValidWhatsapp, normalizeWhatsapp } from '../common/utils/whatsapp';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import {
  SUPPORT_GUEST_COOKIE,
  SUPPORT_GUEST_TTL_DAYS,
  type SupportActor,
} from './support.types';

@Injectable()
export class SupportGuestService {
  constructor(private readonly prisma: PrismaService) {}

  private cookieOptions() {
    const secure = process.env.COOKIE_SECURE === 'true';
    const sameSiteRaw = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
    const sameSite =
      sameSiteRaw === 'strict' || sameSiteRaw === 'none' ? sameSiteRaw : 'lax';
    return {
      httpOnly: true,
      secure,
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
      maxAge: SUPPORT_GUEST_TTL_DAYS * 24 * 60 * 60 * 1000,
    };
  }

  async createSession(input: { name: string; whatsappNumber: string }, res: Response) {
    const whatsappNumber = normalizeWhatsapp(input.whatsappNumber);
    if (!isValidWhatsapp(whatsappNumber)) {
      throw new UnprocessableEntityException(
        createErrorResponse('VALIDATION_ERROR', 'Invalid WhatsApp number', newRequestId()),
      );
    }
    const name = input.name.trim();
    if (name.length < 2) {
      throw new UnprocessableEntityException(
        createErrorResponse('VALIDATION_ERROR', 'Name is required', newRequestId()),
      );
    }

    const rawToken = randomToken(32);
    const expiresAt = new Date(Date.now() + SUPPORT_GUEST_TTL_DAYS * 24 * 60 * 60 * 1000);
    const session = await this.prisma.supportGuestSession.create({
      data: {
        tokenHash: sha256(rawToken),
        name,
        whatsappNumber,
        expiresAt,
      },
    });

    res.cookie(SUPPORT_GUEST_COOKIE, rawToken, this.cookieOptions());

    // Readable CSRF cookie so guest REST mutations (send/upload) pass CsrfGuard.
    const csrfToken = randomToken(24);
    const csrfName = process.env.CSRF_COOKIE_NAME ?? 'csrf_token';
    const secure = process.env.COOKIE_SECURE === 'true';
    const sameSiteRaw = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
    const sameSite =
      sameSiteRaw === 'strict' || sameSiteRaw === 'none' ? sameSiteRaw : 'lax';
    res.cookie(csrfName, csrfToken, {
      httpOnly: false,
      secure,
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
      maxAge: SUPPORT_GUEST_TTL_DAYS * 24 * 60 * 60 * 1000,
    });

    return {
      id: session.id,
      name: session.name,
      whatsappNumber: session.whatsappNumber,
      expiresAt: session.expiresAt.toISOString(),
      csrfToken,
    };
  }

  clearCookie(res: Response) {
    res.clearCookie(SUPPORT_GUEST_COOKIE, {
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
    });
  }

  async resolveFromRequest(req: Request): Promise<SupportActor | null> {
    const raw = req.cookies?.[SUPPORT_GUEST_COOKIE] as string | undefined;
    if (!raw) return null;
    return this.resolveFromToken(raw);
  }

  async resolveFromToken(rawToken: string): Promise<SupportActor | null> {
    const session = await this.prisma.supportGuestSession.findUnique({
      where: { tokenHash: sha256(rawToken) },
    });
    if (!session || session.expiresAt < new Date()) return null;
    if (session.linkedUserId) return null;
    return {
      kind: 'guest',
      guestSessionId: session.id,
      name: session.name,
      whatsappNumber: session.whatsappNumber,
    };
  }

  async requireGuest(req: Request): Promise<Extract<SupportActor, { kind: 'guest' }>> {
    const actor = await this.resolveFromRequest(req);
    if (!actor || actor.kind !== 'guest') {
      throw new UnauthorizedException(
        createErrorResponse('GUEST_REQUIRED', 'Start a guest support session first', newRequestId()),
      );
    }
    return actor;
  }

  /** Link open guest conversations when a user registers/logs in with matching WhatsApp. */
  async linkGuestToUser(userId: string, whatsappNumber: string, res?: Response) {
    const normalized = normalizeWhatsapp(whatsappNumber);
    const guests = await this.prisma.supportGuestSession.findMany({
      where: {
        whatsappNumber: normalized,
        linkedUserId: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (guests.length === 0) return { linked: 0 };

    await this.prisma.$transaction(async (tx) => {
      for (const guest of guests) {
        await tx.supportGuestSession.update({
          where: { id: guest.id },
          data: { linkedUserId: userId },
        });
        await tx.supportConversation.updateMany({
          where: { guestSessionId: guest.id, userId: null },
          data: {
            userId,
            guestName: guest.name,
            guestWhatsapp: guest.whatsappNumber,
          },
        });
      }
    });

    res?.clearCookie(SUPPORT_GUEST_COOKIE, {
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
    });

    return { linked: guests.length };
  }
}
