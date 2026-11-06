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
  kind?: string;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  publishedAt?: string | null;
};

export type QuestionDetail = {
  id: string;
  title: string;
  content: string;
  explanation?: string;
  modelAnswer?: string;
  difficulty: string;
  kind?: string;
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
  totalAttempted?: number;
  totalCorrect?: number;
  accuracyPct?: number;
  perCategory?: Array<{
    categoryId: string;
    name: string;
    attempted: number;
    correct: number;
  }>;
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

export type ExamPaperMeta = {
  id: string;
  title: string;
  slug: string;
  examBody: string;
  year?: number | null;
  description?: string | null;
  durationMinutes: number;
  totalMarks?: number | null;
  isPublished: boolean;
  publishedAt?: string | null;
  questionCount: number;
};

export type ExamPaperDetail = ExamPaperMeta & {
  questions: QuestionListItem[];
};

export type ExamAttemptQuestion = {
  id: string;
  title: string;
  content: string;
  kind: string;
  difficulty: string;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  options: Array<{
    id: string;
    label: string;
    content: string;
    sortOrder?: number;
  }>;
};

export type ExamAttemptStart = {
  attemptId: string;
  startedAt: string;
  durationMinutes: number;
  totalCount: number;
  examPaper: ExamPaperMeta;
  questions: ExamAttemptQuestion[];
};

export type ExamAttemptSummary = {
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  startedAt: string;
  submittedAt?: string | null;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalCount: number;
  examPaper: {
    id: string;
    title: string;
    slug: string;
    examBody: string;
    year?: number | null;
    durationMinutes: number;
    totalMarks?: number | null;
  };
};

export type ExamAttemptDetail = ExamAttemptSummary & {
  answersVisible: boolean;
  questions: Array<{
    id: string;
    title: string;
    content: string;
    kind: string;
    difficulty: string;
    category: { id: string; name: string; slug: string };
    subcategory?: { id: string; name: string; slug: string } | null;
    options: Array<{
      id: string;
      label: string;
      content: string;
      isCorrect?: boolean;
      sortOrder?: number;
    }>;
    explanation?: string;
    modelAnswer?: string;
    selectedOptionId?: string | null;
    isCorrect?: boolean;
  }>;
};
