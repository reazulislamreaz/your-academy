/**
 * Create the first dashboard Admin (DEC-048) without running the demo seed.
 *
 *   pnpm admin:create                      # uses BOOTSTRAP_ADMIN_* from .env
 *   BOOTSTRAP_ADMIN_WHATSAPP=01712345678 BOOTSTRAP_ADMIN_PASSWORD='…' pnpm admin:create
 *
 * Inside the production API container:
 *   docker compose -f docker/docker-compose.prod.yml exec api \
 *     sh -c 'cd /app/backend && ./node_modules/.bin/tsx prisma/create-admin.ts'
 *
 * The password is read from the environment only (never argv) so it stays out of
 * shell history and process lists. Re-running is safe: an existing account is left
 * untouched unless --reset-password is passed. Learner accounts are never promoted.
 */
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { isValidWhatsapp, normalizeWhatsapp } from '@your-academy/shared';
import * as argon2 from 'argon2';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

function fail(message: string): never {
  console.error(`create-admin: ${message}`);
  process.exit(1);
}

async function main() {
  const resetPassword = process.argv.includes('--reset-password');
  const rawWhatsapp = process.env.BOOTSTRAP_ADMIN_WHATSAPP?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? '';
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || 'Platform Admin';
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || null;

  if (!rawWhatsapp) fail('set BOOTSTRAP_ADMIN_WHATSAPP');
  const whatsappNumber = normalizeWhatsapp(rawWhatsapp);
  if (!isValidWhatsapp(whatsappNumber)) fail(`invalid Bangladeshi WhatsApp number: ${rawWhatsapp}`);
  if (!PASSWORD_PATTERN.test(password)) {
    fail('BOOTSTRAP_ADMIN_PASSWORD must be 8–128 characters with at least one letter and one number');
  }
  if (process.env.NODE_ENV === 'production' && password === 'ChangeMeAdmin123') {
    fail('refusing the example password in production — set a strong BOOTSTRAP_ADMIN_PASSWORD');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { whatsappNumber } });
    if (existing) {
      if (existing.role !== UserRole.ADMIN) {
        fail(`${whatsappNumber} already belongs to a ${existing.role} account; not promoting it`);
      }
      if (!resetPassword) {
        console.log(`Admin ${whatsappNumber} already exists — no changes (use --reset-password to rotate).`);
        return;
      }
      await prisma.$transaction([
        prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
            status: UserStatus.ACTIVE,
          },
        }),
        prisma.authSession.updateMany({
          where: { userId: existing.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      console.log(`Admin ${whatsappNumber}: password reset and all sessions revoked.`);
      return;
    }

    if (email && (await prisma.user.findUnique({ where: { email } }))) {
      fail(`email ${email} is already used by another account`);
    }

    const now = new Date();
    await prisma.user.create({
      data: {
        name,
        whatsappNumber,
        email,
        // Operator-provisioned address: trusted so the admin can use password reset.
        emailVerifiedAt: email ? now : null,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`Created admin ${whatsappNumber}${email ? ` (${email})` : ''}. Sign in at /login.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
