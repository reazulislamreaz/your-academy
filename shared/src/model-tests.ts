/** Public guest Model Test contracts (parallel to DEC-039 guest exams). */

export type ModelTestCategoryRef = {
  id: string;
  name: string;
  slug: string;
};

export type PublicModelTestListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  examYear: number | null;
  category: ModelTestCategoryRef | null;
  totalQuestions: number;
  durationInMinutes: number;
  createdAt: string;
};

export type PublicModelTestQuestion = {
  id: string;
  questionText: string;
  options: string[];
  sortOrder: number;
};

export type PublicModelTestDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  examYear: number | null;
  category: ModelTestCategoryRef | null;
  totalQuestions: number;
  durationInMinutes: number;
  createdAt: string;
  questions: PublicModelTestQuestion[];
};

export type ModelTestSubmitResult = {
  attemptId: string;
  modelTestId: string;
  modelTestSlug: string;
  userName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
  timedOut: boolean;
  submittedAt: string;
};

export type ModelTestAnswerSheetItem = {
  id: string;
  questionText: string;
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string | null;
  isCorrect: boolean;
  isSkipped: boolean;
};

export type ModelTestAttemptResult = {
  attemptId: string;
  userName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
  timedOut: boolean;
  elapsedSeconds: number | null;
  submittedAt: string;
  modelTest: {
    id: string;
    title: string;
    slug: string;
    totalQuestions: number;
    durationInMinutes: number;
    examYear: number | null;
  };
  answerSheet: ModelTestAnswerSheetItem[];
};

export type AdminModelTestUploadResult = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  examYear: number | null;
  category: ModelTestCategoryRef | null;
  totalQuestions: number;
  durationInMinutes: number;
  isPublished: boolean;
  createdAt: string;
  headerRowNumber: number;
  suggestedTitle: string | null;
  parseWarnings: string[];
  preview: Array<{
    id: string;
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string | null;
    sortOrder: number;
  }>;
};

export type AdminModelTestListItem = {
  id: string;
  title: string;
  slug: string;
  examYear: number | null;
  category: ModelTestCategoryRef | null;
  totalQuestions: number;
  durationInMinutes: number;
  isPublished: boolean;
  createdAt: string;
  _count: { attempts: number };
};
