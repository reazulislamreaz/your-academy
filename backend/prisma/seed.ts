import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

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

  const programming = await prisma.category.upsert({
    where: { slug: 'programming' },
    update: { name: 'Programming', isActive: true },
    create: {
      name: 'Programming',
      slug: 'programming',
      description: 'Software development topics',
      sortOrder: 1,
    },
  });

  const subcategories = [
    { name: 'JavaScript', slug: 'javascript', sortOrder: 1 },
    { name: 'TypeScript', slug: 'typescript', sortOrder: 2 },
    { name: 'Node.js', slug: 'nodejs', sortOrder: 3 },
    { name: 'React', slug: 'react', sortOrder: 4 },
    { name: 'Database', slug: 'database', sortOrder: 5 },
  ] as const;

  for (const sub of subcategories) {
    await prisma.category.upsert({
      where: { slug: sub.slug },
      update: {
        name: sub.name,
        parentId: programming.id,
        isActive: true,
        sortOrder: sub.sortOrder,
      },
      create: {
        name: sub.name,
        slug: sub.slug,
        parentId: programming.id,
        sortOrder: sub.sortOrder,
      },
    });
  }

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

  // Never log passwords or hashes.
  console.log('Seed complete');
  console.log(`  Admin user id: ${admin.id}`);
  console.log(`  Admin WhatsApp: ${adminWhatsapp}`);
  console.log(`  Category: Programming + ${subcategories.length} subcategories`);
  console.log('  Plan: PREMIUM (payment capture not enabled in v1)');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
