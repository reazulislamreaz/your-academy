import { ExecutionContext, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from '../request-id';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (user) return user;
    // Keep strategy messages such as "Session expired" instead of masking them.
    if (err instanceof HttpException) throw err;
    throw new UnauthorizedException(
      createErrorResponse('UNAUTHORIZED', 'Authentication required', newRequestId()),
    );
  }
}
