import type { UserRole } from '@prisma/client';

export interface RequestUser {
  userId: string;
  role: UserRole;
  sessionId: string;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  sid: string;
}
