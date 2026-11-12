export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  children: Array<{ id: string; name: string; slug: string }>;
};

export type PublicStats = {
  questions: number;
  categories: number;
  news: number;
  documents: number;
};

export type NewsListItem = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  publishedAt?: string | null;
};

export type QuestionListItem = {
  id: string;
  title: string;
  difficulty: string;
  examTags?: string[];
  sourceNote?: string | null;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  publishedAt?: string | null;
};

export type QuestionDetail = {
  id: string;
  title: string;
  content: string;
  explanation?: string;
  difficulty: string;
  examTags?: string[];
  sourceNote?: string | null;
  options: Array<{
    id: string;
    label: string;
    content: string;
    isCorrect?: boolean;
    sortOrder?: number;
  }>;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  publishedAt?: string | null;
  bookmarked: boolean;
  /** Present when saved into a named folder; null when uncategorized or unsaved. */
  collection?: { id: string; name: string } | null;
  answersVisible: boolean;
};

export type BookmarkCollectionSummary = {
  id: string;
  name: string;
  questionCount: number;
  createdAt?: string;
  updatedAt?: string;
  containsQuestion?: boolean;
};

export type BookmarkCollectionsPayload = {
  items: BookmarkCollectionSummary[];
  uncategorized: {
    id: null;
    name: string;
    questionCount: number;
    containsQuestion?: boolean;
  };
  bookmarked: boolean;
  activeCollectionId: string | null;
};

export type SaveQuestionBookmarkResult = {
  id: string;
  userId: string;
  questionId: string;
  collectionId: string | null;
  createdAt: string;
  collection: { id: string; name: string } | null;
  created: boolean;
  moved: boolean;
};

export type PracticeSetKind =
  | 'DAILY_QUIZ'
  | 'SUBJECT_QUIZ'
  | 'TOPIC_QUIZ'
  | 'MODEL_TEST'
  | 'PREVIOUS_YEAR_SET';

export type PracticeSetListItem = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  kind: PracticeSetKind;
  durationSeconds?: number | null;
  marksPerCorrect: number;
  negativeMarkPerWrong: number;
  examTag?: string | null;
  isDaily: boolean;
  publishedAt?: string | null;
  questionCount: number;
  category?: { id: string; name: string; slug: string } | null;
  subcategory?: { id: string; name: string; slug: string } | null;
};

export type PracticeSetDetail = PracticeSetListItem & {
  questions: Array<{
    sortOrder: number;
    id: string;
    title: string;
    content: string;
    difficulty: string;
    options: Array<{ id: string; label: string; content: string; sortOrder: number }>;
  }>;
  activeAttempt?: {
    id: string;
    practiceSetId: string;
    status: string;
    startedAt: string;
    maxScore?: number | null;
    durationSeconds?: number | null;
    expiresAt?: string | null;
  } | null;
};

export type PracticeAttemptSummary = {
  id: string;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  score?: number | null;
  maxScore?: number | null;
  correctCount?: number | null;
  wrongCount?: number | null;
  skippedCount?: number | null;
  practiceSet: {
    id: string;
    title: string;
    slug: string;
    kind: PracticeSetKind;
    examTag?: string | null;
  };
};

export type PracticeAttemptResult = {
  id: string;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  score?: number | null;
  maxScore?: number | null;
  correctCount?: number | null;
  wrongCount?: number | null;
  skippedCount?: number | null;
  answersVisible: boolean;
  practiceSet: {
    id: string;
    title: string;
    slug: string;
    kind: PracticeSetKind;
    durationSeconds?: number | null;
    marksPerCorrect: number;
    negativeMarkPerWrong: number;
    examTag?: string | null;
  };
  review: Array<{
    questionId: string;
    title: string;
    content: string;
    difficulty: string;
    selectedOptionId?: string | null;
    isCorrect?: boolean | null;
    explanation?: string;
    options: Array<{
      id: string;
      label: string;
      content: string;
      sortOrder: number;
      isCorrect?: boolean;
    }>;
  }>;
};

export type DocumentListItem = {
  id: string;
  title: string;
  description?: string | null;
  visibility: string;
  category?: { id: string; name: string } | null;
  updatedAt: string;
};

export type AccessSnapshot = {
  trialStartedAt: string;
  trialEndsAt: string;
  isTrialActive: boolean;
  hasActiveSubscription: boolean;
  role: string;
  entitlements: string[];
};

export type StudyLastQuestion = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  filterQs?: string;
};

export type StudyPrefs = {
  preferredCategoryIds: string[];
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  lastQuestion: StudyLastQuestion | null;
};

export type MeUser = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  role: string;
  status: string;
  createdAt?: string;
  /** Short-lived signed Cloudinary URL when an avatar is set. */
  avatarUrl?: string | null;
  access: AccessSnapshot;
  study: StudyPrefs;
};

export type PerformanceByCategory = {
  categoryId: string;
  name: string;
  attempts: number;
  correct: number;
  accuracyPercent: number;
};

export type RecentAttempt = {
  id: string;
  questionId: string;
  title: string;
  isCorrect: boolean;
  categoryName: string;
  createdAt: string;
};

export type UserPerformance = {
  totalAttempts: number;
  uniqueQuestions: number;
  correct: number;
  incorrect: number;
  accuracyPercent: number;
  weekAttempts: number;
  weekCorrect: number;
  weekAccuracyPercent: number;
  byCategory: PerformanceByCategory[];
  recentAttempts: RecentAttempt[];
};

export type UserStats = {
  questionBookmarks: number;
  documentBookmarks: number;
  browsingSeconds: number;
  recentQuestions: Array<{
    bookmarkId: string;
    savedAt: string;
    id: string;
    title: string;
    difficulty: string;
  }>;
  recentDocuments: Array<{
    bookmarkId: string;
    savedAt: string;
    id: string;
    title: string;
  }>;
  performance: UserPerformance;
};

/** GET /analytics/me/summary */
export type AnalyticsSummary = {
  totalSeconds: number;
  sessions: number;
  daySeconds: number;
  weekSeconds: number;
};
