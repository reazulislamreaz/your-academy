import {
  Difficulty,
  PrismaClient,
  QuestionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
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

  const subIds: Record<string, string> = {};
  for (const sub of subcategories) {
    const row = await prisma.category.upsert({
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
    subIds[sub.slug] = row.id;
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

  const sampleQuestions: Array<{
    title: string;
    content: string;
    explanation: string;
    subcategorySlug: string;
    difficulty: Difficulty;
    options: Array<{ label: string; content: string; isCorrect: boolean }>;
  }> = [
    {
      title: 'What does === compare in JavaScript?',
      content: 'Which statement best describes the === operator?',
      explanation: '=== compares both value and type without coercion.',
      subcategorySlug: 'javascript',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', content: 'Value only, with type coercion', isCorrect: false },
        { label: 'B', content: 'Value and type without coercion', isCorrect: true },
        { label: 'C', content: 'Object identity only', isCorrect: false },
        { label: 'D', content: 'Truthy vs falsy only', isCorrect: false },
      ],
    },
    {
      title: 'TypeScript: unknown vs any',
      content: 'Why prefer unknown over any for untrusted input?',
      explanation: 'unknown forces you to narrow before use; any disables checking.',
      subcategorySlug: 'typescript',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', content: 'unknown is assignable to every type automatically', isCorrect: false },
        { label: 'B', content: 'unknown requires narrowing before safe use', isCorrect: true },
        { label: 'C', content: 'any is deprecated by the TypeScript team', isCorrect: false },
        { label: 'D', content: 'unknown only works with classes', isCorrect: false },
      ],
    },
    {
      title: 'Node.js event loop',
      content: 'Which queue runs after the current call stack clears and before I/O callbacks?',
      explanation: 'process.nextTick queues microtasks ahead of other async work.',
      subcategorySlug: 'nodejs',
      difficulty: Difficulty.MEDIUM,
      options: [
        { label: 'A', content: 'setTimeout(fn, 0)', isCorrect: false },
        { label: 'B', content: 'setImmediate', isCorrect: false },
        { label: 'C', content: 'process.nextTick', isCorrect: true },
        { label: 'D', content: 'fs.readFile', isCorrect: false },
      ],
    },
    {
      title: 'React key prop',
      content: 'Why should list keys be stable and unique among siblings?',
      explanation: 'Stable keys help React reconcile list items without remounting incorrectly.',
      subcategorySlug: 'react',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', content: 'Keys improve CSS specificity', isCorrect: false },
        { label: 'B', content: 'Keys identify items across renders for reconciliation', isCorrect: true },
        { label: 'C', content: 'Keys are required for context providers', isCorrect: false },
        { label: 'D', content: 'Keys replace useId for forms', isCorrect: false },
      ],
    },
    {
      title: 'SQL primary key',
      content: 'A primary key must be:',
      explanation: 'Primary keys uniquely identify rows and cannot be NULL.',
      subcategorySlug: 'database',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', content: 'Nullable and unique', isCorrect: false },
        { label: 'B', content: 'Unique and not null', isCorrect: true },
        { label: 'C', content: 'Indexed only on text columns', isCorrect: false },
        { label: 'D', content: 'Always a UUID string', isCorrect: false },
      ],
    },
    {
      title: 'Array.prototype.map return value',
      content: 'What does map return?',
      explanation: 'map returns a new array with the results of calling the callback on each element.',
      subcategorySlug: 'javascript',
      difficulty: Difficulty.EASY,
      options: [
        { label: 'A', content: 'The mutated original array', isCorrect: false },
        { label: 'B', content: 'A new array of mapped values', isCorrect: true },
        { label: 'C', content: 'Only the first matching element', isCorrect: false },
        { label: 'D', content: 'A boolean success flag', isCorrect: false },
      ],
    },
  ];

  let seededQuestions = 0;
  for (const sample of sampleQuestions) {
    const existing = await prisma.question.findFirst({
      where: { title: sample.title, deletedAt: null },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.question.create({
      data: {
        title: sample.title,
        content: sample.content,
        explanation: sample.explanation,
        categoryId: programming.id,
        subcategoryId: subIds[sample.subcategorySlug],
        difficulty: sample.difficulty,
        status: QuestionStatus.PUBLISHED,
        publishedAt: new Date(),
        createdById: admin.id,
        options: {
          create: sample.options.map((o, index) => ({
            label: o.label,
            content: o.content,
            isCorrect: o.isCorrect,
            sortOrder: index,
          })),
        },
      },
    });
    seededQuestions += 1;
  }

  const newsSlug = 'welcome-to-your-academy';
  await prisma.news.upsert({
    where: { slug: newsSlug },
    update: {
      title: 'Welcome to Your Academy',
      summary: 'How the seven-day trial works and what stays free afterward.',
      body: `Your Academy gives you a full week with answers and explanations unlocked.

After the trial ends you can still browse questions, save bookmarks, and read news. Correct answers and explanations remain premium.

Create an account with your WhatsApp number to start.`,
      isPublished: true,
      publishedAt: new Date(),
      createdById: admin.id,
      deletedAt: null,
    },
    create: {
      title: 'Welcome to Your Academy',
      slug: newsSlug,
      summary: 'How the seven-day trial works and what stays free afterward.',
      body: `Your Academy gives you a full week with answers and explanations unlocked.

After the trial ends you can still browse questions, save bookmarks, and read news. Correct answers and explanations remain premium.

Create an account with your WhatsApp number to start.`,
      isPublished: true,
      publishedAt: new Date(),
      createdById: admin.id,
    },
  });

  let media = await prisma.mediaAsset.findFirst({
    where: { publicId: 'seed/study-notes-placeholder', resourceType: 'RAW' },
  });
  if (!media) {
    media = await prisma.mediaAsset.create({
      data: {
        publicId: 'seed/study-notes-placeholder',
        resourceType: 'RAW',
        deliveryType: 'UPLOAD',
        format: 'pdf',
        bytes: 1024,
        mimeType: 'application/pdf',
        originalFilename: 'study-notes-placeholder.pdf',
        uploadedById: admin.id,
      },
    });
  }

  const existingDoc = await prisma.document.findFirst({
    where: { title: 'Programming quick reference (sample)', deletedAt: null },
  });
  if (!existingDoc) {
    await prisma.document.create({
      data: {
        title: 'Programming quick reference (sample)',
        description:
          'Sample PDF metadata for the library. Secure download activates when Cloudinary storage is configured.',
        mediaAssetId: media.id,
        categoryId: programming.id,
        visibility: 'AUTHENTICATED',
        isPublished: true,
        createdById: admin.id,
      },
    });
  }

  console.log('Seed complete');
  console.log(`  Admin user id: ${admin.id}`);
  console.log(`  Admin WhatsApp: ${adminWhatsapp}`);
  console.log(`  Category: Programming + ${subcategories.length} subcategories`);
  console.log(`  New sample questions: ${seededQuestions}`);
  console.log('  News: welcome-to-your-academy');
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
