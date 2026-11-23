import type { Prisma, PrismaClient } from '@prisma/client';
import { randomToken, sha256 } from '../common/utils/crypto';

const DEFAULT_TTL_SECONDS = 1800;

export type IssuedResetToken = {
  resetUrl: string;
  tokenHash: string;
  expiresAt: Date;
  expiresInMinutes: number;
};

export function passwordResetTtlSeconds(): number {
  return Number(process.env.PASSWORD_RESET_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
}

/**
 * The one password-reset token system (self-service and admin-assisted).
 * Random 32-byte token, stored only as SHA-256, single-use, time-limited;
 * issuing a new one voids every unused older link for the user.
 */
export async function issuePasswordResetToken(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  opts: { verifiesEmail?: string | null } = {},
): Promise<IssuedResetToken> {
  const token = randomToken(32);
  const tokenHash = sha256(token);
  const ttl = passwordResetTtlSeconds();
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await db.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  await db.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt, verifiesEmail: opts.verifiesEmail ?? null },
  });

  const base = process.env.PASSWORD_RESET_URL_BASE ?? 'http://localhost:3000/reset-password';
  return {
    resetUrl: `${base}?token=${token}`,
    tokenHash,
    expiresAt,
    expiresInMinutes: Math.round(ttl / 60),
  };
}
