import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Bootstrap only: admin + demo learner + Premium plan.
 * Does **not** create demo categories, MCQs, or practice sets (product content
 * comes from Admin uploads / Categories UI).
 */
async function main() {
  const adminWhatsapp = process.env.BOOTSTRAP_ADMIN_WHATSAPP ?? '+8801000000000';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'ChangeMeAdmin123';
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@your-academy.local';
  const trialDays = Number(process.env.TRIAL_DAYS ?? 7);

  const trialStartedAt = new Date();
  const trialEndsAt = addDays(trialStartedAt, trialDays);
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { whatsappNumber: adminWhatsapp },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      email: adminEmail,
      deletedAt: null,
    },
    create: {
      name: 'Platform Admin',
      whatsappNumber: adminWhatsapp,
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      trialStartedAt,
      trialEndsAt,
    },
  });

  await prisma.user.upsert({
    where: { whatsappNumber: '+8801711111111' },
    update: {
      name: 'Test Learner',
      status: UserStatus.ACTIVE,
      passwordHash: await argon2.hash('LearnerPass123', { type: argon2.argon2id }),
      deletedAt: null,
      role: UserRole.USER,
      trialStartedAt,
      trialEndsAt,
    },
    create: {
      name: 'Test Learner',
      whatsappNumber: '+8801711111111',
      email: 'learner@your-academy.local',
      passwordHash: await argon2.hash('LearnerPass123', { type: argon2.argon2id }),
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      trialStartedAt,
      trialEndsAt,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'PREMIUM' },
    update: {
      name: 'Premium',
      isActive: true,
      entitlements: ['VIEW_ANSWERS', 'VIEW_EXPLANATIONS', 'VIEW_DOCUMENTS'],
    },
    create: {
      code: 'PREMIUM',
      name: 'Premium',
      description: 'Full access to answers and explanations (future paid plan)',
      durationDays: 30,
      priceCents: 0,
      currency: 'USD',
      entitlements: ['VIEW_ANSWERS', 'VIEW_EXPLANATIONS', 'VIEW_DOCUMENTS'],
      isActive: true,
    },
  });

  const catCount = await prisma.category.count();
  console.log(
    `Seeded admin=${admin.whatsappNumber}, learner=+8801711111111 / LearnerPass123 (bootstrap only; categories untouched=${catCount})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
