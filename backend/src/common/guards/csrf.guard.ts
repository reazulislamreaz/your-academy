import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import type { Request } from 'express';
import { safeEqual } from '../utils/crypto';
import { newRequestId } from '../request-id';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE.has(req.method.toUpperCase())) return true;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ') && !req.cookies?.access_token) {
      return true;
    }

    const cookieName = process.env.CSRF_COOKIE_NAME ?? 'csrf_token';
    const header = String(req.headers['x-csrf-token'] ?? '');
    const cookie = String(req.cookies?.[cookieName] ?? '');

    if (!header || !cookie || !safeEqual(header, cookie)) {
      throw new ForbiddenException(
        createErrorResponse('CSRF_VALIDATION_FAILED', 'Invalid CSRF token', newRequestId()),
      );
    }
    return true;
  }
}
