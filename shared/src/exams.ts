/** Public guest exam contracts (DEC-039). */

export type PublicExamListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  totalQuestions: number;
  durationInMinutes: number;
  createdAt: string;
};

export type PublicExamQuestion = {
  id: string;
  questionText: string;
  options: string[];
  sortOrder: number;
};

export type PublicExamDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  totalQuestions: number;
  durationInMinutes: number;
  createdAt: string;
  questions: PublicExamQuestion[];
};

export type ExamSubmitResult = {
  attemptId: string;
  examId: string;
  examSlug: string;
  userName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  percent: number;
  timedOut: boolean;
  submittedAt: string;
};

export type ExamAnswerSheetItem = {
  id: string;
  questionText: string;
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  explanation: string | null;
  isCorrect: boolean;
  isSkipped: boolean;
};

export type ExamAttemptResult = {
  attemptId: string;
  userName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  percent: number;
  timedOut: boolean;
  elapsedSeconds: number | null;
  submittedAt: string;
  exam: {
    id: string;
    title: string;
    slug: string;
    totalQuestions: number;
    durationInMinutes: number;
  };
  answerSheet: ExamAnswerSheetItem[];
};

export type AdminExamUploadResult = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  totalQuestions: number;
  durationInMinutes: number;
  isPublished: boolean;
  createdAt: string;
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

/** `/exams` (Quiz) sidebar guide item (UTF-8 Bengali supported). */
/** Admin edit view of a quiz — includes answers (admin / moderator only). */
export type AdminExamQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  /** 0–3 when `correctAnswer` matches an option; -1 if it no longer does. */
  correctOptionIndex: number;
  explanation: string | null;
  sortOrder: number;
};

export type AdminExamDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  totalQuestions: number;
  durationInMinutes: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  questions: AdminExamQuestion[];
};

export type ExamGuideItem = {
  id: string;
  text: string;
};

/** Authenticated profile history for public Quiz / Model Test attempts (DEC-045). */
export type TimedAttemptSummary = {
  id: string;
  kind: 'exam' | 'model-test';
  title: string;
  slug: string;
  score: number;
  totalQuestions: number;
  percent: number;
  submittedAt: string;
  resultPath: string;
};

/** Public + admin payload for the Quiz listing sidebar guide (DEC-044). */
export type ExamGuideConfig = {
  title: string;
  items: ExamGuideItem[];
  updatedAt: string | null;
};

export const DEFAULT_EXAM_GUIDE_TITLE = 'কুইজ কীভাবে দিবেন';

export const DEFAULT_EXAM_GUIDE_ITEMS: ExamGuideItem[] = [
  {
    id: 'quiz-guide-1',
    text: 'খুঁজুন / সার্চ করে একটি কুইজ বেছে নিন।',
  },
  {
    id: 'quiz-guide-2',
    text: 'নাম দিয়ে শুরু — টাইমার চলবে।',
  },
  {
    id: 'quiz-guide-3',
    text: 'এক পৃষ্ঠায় ক–ঘ উত্তর মার্ক করুন।',
  },
  {
    id: 'quiz-guide-4',
    text: 'স্কিপ থাকলে সাবমিটের আগে নিশ্চিতকরণ আসবে।',
  },
  {
    id: 'quiz-guide-5',
    text: 'ফলাফলে স্কোর ও সঠিক/ভুল দেখুন।',
  },
];
