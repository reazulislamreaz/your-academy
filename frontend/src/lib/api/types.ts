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
  answersVisible: boolean;
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
