import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/** Attaches `req.user` when a valid JWT is present; otherwise continues anonymously. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const accessName = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
    const hasCookie = Boolean(req.cookies?.[accessName]);
    const auth = req.headers.authorization;
    const hasBearer = typeof auth === 'string' && auth.startsWith('Bearer ');
    if (!hasCookie && !hasBearer) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser | null {
    if (err || !user) return null;
    return user;
  }
}
