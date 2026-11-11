import {
  Difficulty,
  PracticeSetKind,
  PracticeSetStatus,
  PrismaClient,
  QuestionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { EXAM_TAGS, SUBJECTS, questionsForSubject } from './seed-catalog';

const prisma = new PrismaClient();

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
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

  const learnerHash = await argon2.hash('LearnerPass123', { type: argon2.argon2id });
  const learner = await prisma.user.upsert({
    where: { whatsappNumber: '+8801711111111' },
    update: {
      name: 'Test Learner',
      status: UserStatus.ACTIVE,
      passwordHash: learnerHash,
      deletedAt: null,
      role: UserRole.USER,
      trialStartedAt,
      trialEndsAt,
    },
    create: {
      name: 'Test Learner',
      whatsappNumber: '+8801711111111',
      email: 'learner@your-academy.local',
      passwordHash: learnerHash,
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

  // Clear prior demo questions/practice sets for idempotent reseed of content.
  await prisma.practiceAttemptAnswer.deleteMany();
  await prisma.practiceAttempt.deleteMany();
  await prisma.practiceSetItem.deleteMany();
  await prisma.practiceSet.deleteMany();
  await prisma.questionAttempt.deleteMany();
  await prisma.questionBookmark.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();

  const subjectIds: Record<string, string> = {};
  const topicIds: Record<string, string> = {};

  for (const [si, subject] of SUBJECTS.entries()) {
    const root = await prisma.category.upsert({
      where: { slug: subject.slug },
      update: {
        name: subject.name,
        description: subject.description,
        isActive: true,
        sortOrder: si + 1,
        parentId: null,
      },
      create: {
        name: subject.name,
        slug: subject.slug,
        description: subject.description,
        sortOrder: si + 1,
        isActive: true,
      },
    });
    subjectIds[subject.slug] = root.id;

    for (const [ti, topic] of subject.topics.entries()) {
      const child = await prisma.category.upsert({
        where: { slug: topic.slug },
        update: {
          name: topic.name,
          parentId: root.id,
          isActive: true,
          sortOrder: ti + 1,
        },
        create: {
          name: topic.name,
          slug: topic.slug,
          parentId: root.id,
          sortOrder: ti + 1,
          isActive: true,
        },
      });
      topicIds[topic.slug] = child.id;
    }
  }

  const allQuestionIds: string[] = [];
  const questionsBySubject: Record<string, string[]> = {};
  const questionsByExamTag: Record<string, string[]> = {};

  for (const subject of SUBJECTS) {
    const items = questionsForSubject(subject.slug);
    questionsBySubject[subject.slug] = [];
    for (const item of items) {
      const subcategoryId = topicIds[item.topicSlug];
      if (!subcategoryId) continue;
      const created = await prisma.question.create({
        data: {
          title: item.title.slice(0, 200),
          content: item.content,
          explanation: item.explanation,
          categoryId: subjectIds[subject.slug]!,
          subcategoryId,
          difficulty: item.difficulty,
          status: QuestionStatus.PUBLISHED,
          examTags: item.examTags,
          sourceNote: item.sourceNote,
          publishedAt: new Date(),
          createdById: admin.id,
          options: {
            create: item.options.map((o, index) => ({
              label: o.label,
              content: o.content,
              isCorrect: o.isCorrect,
              sortOrder: index,
            })),
          },
        },
      });
      allQuestionIds.push(created.id);
      questionsBySubject[subject.slug]!.push(created.id);
      for (const tag of item.examTags) {
        (questionsByExamTag[tag] ??= []).push(created.id);
      }
    }
  }

  // Prefer first 3 subjects for learner onboarding prefs.
  await prisma.user.update({
    where: { id: learner.id },
    data: {
      preferredCategoryIds: SUBJECTS.slice(0, 3).map((s) => subjectIds[s.slug]!),
      onboardingCompletedAt: new Date(),
      lastQuestionId: allQuestionIds[0] ?? null,
    },
  });

  if (allQuestionIds[0]) {
    await prisma.questionBookmark.upsert({
      where: {
        userId_questionId: { userId: learner.id, questionId: allQuestionIds[0]! },
      },
      update: {},
      create: { userId: learner.id, questionId: allQuestionIds[0]! },
    });
  }

  async function createPracticeSet(input: {
    title: string;
    slug: string;
    description: string;
    kind: PracticeSetKind;
    durationSeconds: number | null;
    negativeMarkPerWrong: number;
    categoryId?: string;
    subcategoryId?: string;
    examTag?: string;
    isDaily?: boolean;
    questionIds: string[];
  }) {
    const uniqueQs = [...new Set(input.questionIds)].slice(0, 40);
    if (uniqueQs.length < 5) return null;
    const existing = await prisma.practiceSet.findUnique({ where: { slug: input.slug } });
    if (existing) {
      await prisma.practiceSetItem.deleteMany({ where: { practiceSetId: existing.id } });
      return prisma.practiceSet.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          description: input.description,
          kind: input.kind,
          status: PracticeSetStatus.PUBLISHED,
          durationSeconds: input.durationSeconds,
          marksPerCorrect: 1,
          negativeMarkPerWrong: input.negativeMarkPerWrong,
          categoryId: input.categoryId,
          subcategoryId: input.subcategoryId,
          examTag: input.examTag,
          isDaily: input.isDaily ?? false,
          publishedAt: existing.publishedAt ?? new Date(),
          createdById: admin.id,
          items: {
            create: uniqueQs.map((questionId, sortOrder) => ({ questionId, sortOrder })),
          },
        },
      });
    }
    return prisma.practiceSet.create({
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description,
        kind: input.kind,
        status: PracticeSetStatus.PUBLISHED,
        durationSeconds: input.durationSeconds,
        marksPerCorrect: 1,
        negativeMarkPerWrong: input.negativeMarkPerWrong,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        examTag: input.examTag,
        isDaily: input.isDaily ?? false,
        publishedAt: new Date(),
        createdById: admin.id,
        items: {
          create: uniqueQs.map((questionId, sortOrder) => ({ questionId, sortOrder })),
        },
      },
    });
  }

  // Daily quiz
  await createPracticeSet({
    title: 'Daily Quiz — Mixed Practice',
    slug: 'daily-quiz-mixed',
    description: 'আজকের মিশ্র অনুশীলন (ডেমো)। প্রতিদিন ১০টি প্রশ্ন।',
    kind: PracticeSetKind.DAILY_QUIZ,
    durationSeconds: 15 * 60,
    negativeMarkPerWrong: 0,
    isDaily: true,
    questionIds: allQuestionIds.slice(0, 10),
  });

  // Subject quizzes
  for (const subject of SUBJECTS.slice(0, 6)) {
    const ids = questionsBySubject[subject.slug] ?? [];
    await createPracticeSet({
      title: `${subject.name} — Subject Quiz`,
      slug: slugify(`subject-quiz-${subject.slug}`),
      description: `${subject.name} বিষয়ভিত্তিক কুইজ (ডেমো সেট)।`,
      kind: PracticeSetKind.SUBJECT_QUIZ,
      durationSeconds: 20 * 60,
      negativeMarkPerWrong: 0,
      categoryId: subjectIds[subject.slug],
      questionIds: ids.slice(0, 15),
    });
  }

  // Topic quiz sample
  const banglaGrammar = topicIds['bangla-grammar'];
  if (banglaGrammar) {
    const topicQs = await prisma.question.findMany({
      where: { subcategoryId: banglaGrammar, status: QuestionStatus.PUBLISHED },
      select: { id: true },
      take: 12,
    });
    await createPracticeSet({
      title: 'বাংলা ব্যাকরণ — Topic Quiz',
      slug: 'topic-quiz-bangla-grammar',
      description: 'বাংলা ব্যাকরণ টপিক কুইজ (ডেমো)।',
      kind: PracticeSetKind.TOPIC_QUIZ,
      durationSeconds: 12 * 60,
      negativeMarkPerWrong: 0,
      categoryId: subjectIds.bangla,
      subcategoryId: banglaGrammar,
      questionIds: topicQs.map((q) => q.id),
    });
  }

  // Model tests / exam tracks
  for (const exam of EXAM_TAGS.slice(0, 8)) {
    const ids = questionsByExamTag[exam.tag] ?? [];
    await createPracticeSet({
      title: `${exam.label} — Model Test`,
      slug: slugify(`model-test-${exam.tag}`),
      description: `${exam.label} স্টাইলের মডেল টেস্ট। ডেমো প্রশ্ন — আসল পূর্ববর্তী সালের প্রশ্নপত্র নয়।`,
      kind: PracticeSetKind.MODEL_TEST,
      durationSeconds: 60 * 60,
      negativeMarkPerWrong: exam.tag.startsWith('bcs') ? 0.25 : 0,
      examTag: exam.tag,
      questionIds: ids.slice(0, 25),
    });

    await createPracticeSet({
      title: `${exam.label} — Practice Collection`,
      slug: slugify(`py-style-${exam.tag}`),
      description: `Previous-year-style practice collection for ${exam.label}. Synthetic demo items only.`,
      kind: PracticeSetKind.PREVIOUS_YEAR_SET,
      durationSeconds: null,
      negativeMarkPerWrong: 0,
      examTag: exam.tag,
      questionIds: ids.slice(0, 20),
    });
  }

  // News announcements
  const newsItems = [
    {
      title: 'Welcome to Your Academy exam prep',
      slug: 'welcome-exam-prep',
      summary: 'Subject banks, quizzes, and model tests are ready for practice.',
      body: 'This platform uses original demo MCQs for BCS, Bank, Primary Teacher, NTRCA, and other tracks. Items are clearly marked as demo practice—not official previous-year papers unless verified.',
    },
    {
      title: 'Daily Quiz is live',
      slug: 'daily-quiz-live',
      summary: 'Try the mixed daily quiz from your dashboard.',
      body: 'Complete the daily quiz to build consistency. Results appear in My Results after submission.',
    },
    {
      title: 'Study tip: topic first, then model test',
      slug: 'study-tip-topic-model',
      summary: 'Practice by topic, then attempt a model test.',
      body: 'A reliable routine: pick a subject → finish a topic quiz → attempt a model test → review wrong answers.',
    },
  ];

  for (const item of newsItems) {
    await prisma.news.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        summary: item.summary,
        body: item.body,
        isPublished: true,
        publishedAt: new Date(),
        deletedAt: null,
      },
      create: {
        title: item.title,
        slug: item.slug,
        summary: item.summary,
        body: item.body,
        isPublished: true,
        publishedAt: new Date(),
        createdById: admin.id,
      },
    });
  }

  const qCount = await prisma.question.count();
  const setCount = await prisma.practiceSet.count();
  const catCount = await prisma.category.count({ where: { parentId: null } });
  console.log(
    `Seeded admin=${admin.whatsappNumber}, learner=+8801711111111 / LearnerPass123, subjects=${catCount}, questions=${qCount}, practiceSets=${setCount}`,
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
