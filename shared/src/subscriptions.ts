/** DEC-052 — Admin-granted subscriptions (no payment provider in v1). */
export type AdminSubscriptionRecord = {
  id: string;
  planCode: string;
  planName: string;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
  startsAt: string;
  endsAt: string;
  canceledAt: string | null;
  createdAt: string;
  /** ACTIVE status and `startsAt <= now < endsAt`. */
  isCurrent: boolean;
};

export type AdminUserSubscriptionOverview = {
  userId: string;
  role: string;
  /** Admins see answers without a subscription. */
  isAdmin: boolean;
  hasActiveSubscription: boolean;
  current: AdminSubscriptionRecord | null;
  history: AdminSubscriptionRecord[];
};

export type AdminGrantSubscriptionInput = {
  /** ISO date-time; defaults to now. */
  startsAt?: string;
  /** ISO date-time; required, must be after `startsAt` and in the future. */
  endsAt: string;
  note?: string;
};

export type AdminRevokeSubscriptionInput = {
  note?: string;
};

/** DEC-051 — server-side Preli Practice scoring. */
export type PublicPracticeScoreItem = {
  id: string;
  selectedOptionId: string | null;
  isSkipped: boolean;
  /** Entitled viewers only. */
  isCorrect?: boolean;
  correctOptionId?: string | null;
  correctAnswerLabel?: string;
};

export type PublicPracticeScore = {
  setId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number;
  percent: number;
  /** False → answer key / correctness omitted (DEC-051). */
  answersVisible: boolean;
  answerSheet: PublicPracticeScoreItem[];
};
