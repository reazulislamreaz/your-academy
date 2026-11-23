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
  isSkipped: boolean;
  /** DEC-051: present only when the viewer is entitled (`answersVisible`). */
  correctAnswer?: string;
  explanation?: string | null;
  isCorrect?: boolean;
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
  /** DEC-051: false → answer key, explanations and per-question correctness omitted. */
  answersVisible: boolean;
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

/** `/model-test` sidebar guide item (UTF-8 Bengali supported). */
export type ModelTestGuideItem = {
  id: string;
  text: string;
};

/** Public + admin payload for the listing sidebar guide (DEC-043). */
export type ModelTestGuideConfig = {
  title: string;
  items: ModelTestGuideItem[];
  updatedAt: string | null;
};

export const DEFAULT_MODEL_TEST_GUIDE_TITLE = 'মডেল টেস্ট কীভাবে দিবেন';

export const DEFAULT_MODEL_TEST_GUIDE_ITEMS: ModelTestGuideItem[] = [
  {
    id: 'mt-guide-1',
    text: 'খুঁজুন / ফিল্টার করে একটি মডেল টেস্ট বেছে নিন।',
  },
  {
    id: 'mt-guide-2',
    text: 'নাম দিয়ে শুরু — টাইমার চলবে।',
  },
  {
    id: 'mt-guide-3',
    text: 'এক পৃষ্ঠায় ক–ঘ উত্তর মার্ক করুন।',
  },
  {
    id: 'mt-guide-4',
    text: 'স্কিপ থাকলে সাবমিটের আগে নিশ্চিতকরণ আসবে।',
  },
  {
    id: 'mt-guide-5',
    text: 'ফলাফলে স্কোর ও সঠিক/ভুল দেখুন।',
  },
];
