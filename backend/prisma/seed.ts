import { PrismaClient, SocialPlatform, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/** Default footer socials (DEC-046). Create-if-missing so re-seed never overwrites admin edits. */
const BOOTSTRAP_SOCIAL_LINKS: Array<{
  platform: SocialPlatform;
  url: string;
  sortOrder: number;
}> = [
  {
    platform: SocialPlatform.FACEBOOK,
    url: 'https://www.facebook.com/profile.php?id=61595289935829',
    sortOrder: 0,
  },
  {
    platform: SocialPlatform.INSTAGRAM,
    url: 'https://www.instagram.com/youracademy.demo',
    sortOrder: 1,
  },
  {
    platform: SocialPlatform.YOUTUBE,
    url: 'https://www.youtube.com/@youracademy.demo',
    sortOrder: 2,
  },
  {
    platform: SocialPlatform.LINKEDIN,
    url: 'https://www.linkedin.com/company/your-academy-demo',
    sortOrder: 3,
  },
  {
    platform: SocialPlatform.X,
    url: 'https://x.com/youracademy_demo',
    sortOrder: 4,
  },
  {
    platform: SocialPlatform.TIKTOK,
    url: 'https://www.tiktok.com/@youracademy.demo',
    sortOrder: 5,
  },
];

/**
 * Bootstrap only: admin + demo learner + Premium plan.
 * Does **not** create demo categories, MCQs, or practice sets (product content
 * comes from Admin uploads / Categories UI).
 */
async function main() {
  const adminWhatsapp = process.env.BOOTSTRAP_ADMIN_WHATSAPP ?? '+8801000000000';
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'ChangeMeAdmin123';
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@your-academy.local';
  // Free trials disabled — equal timestamps, no trial window.
  const trialStartedAt = new Date();
  const trialEndsAt = trialStartedAt;
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { whatsappNumber: adminWhatsapp },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      email: adminEmail,
      // Operator-provisioned — trusted so the bootstrap admin can use password reset.
      emailVerifiedAt: new Date(),
      deletedAt: null,
    },
    create: {
      name: 'Platform Admin',
      whatsappNumber: adminWhatsapp,
      email: adminEmail,
      emailVerifiedAt: new Date(),
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

  for (const link of BOOTSTRAP_SOCIAL_LINKS) {
    const existing = await prisma.socialLink.findUnique({ where: { platform: link.platform } });
    if (existing) continue;
    await prisma.socialLink.create({
      data: {
        platform: link.platform,
        url: link.url,
        enabled: true,
        sortOrder: link.sortOrder,
        label: '',
      },
    });
  }

  const catCount = await prisma.category.count();
  const socialCount = await prisma.socialLink.count();
  console.log(
    `Seeded admin=${admin.whatsappNumber}, learner=+8801711111111 / LearnerPass123 (bootstrap only; categories untouched=${catCount}; socialLinks=${socialCount})`,
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
