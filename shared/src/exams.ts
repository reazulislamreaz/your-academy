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
