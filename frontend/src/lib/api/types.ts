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
  access: AccessSnapshot;
  study: StudyPrefs;
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
};
