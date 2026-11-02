import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from '../request-id';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Authentication required', newRequestId()),
      );
    }
    return user;
  }
}
