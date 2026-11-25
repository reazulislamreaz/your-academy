import type { SubscriptionSummary } from '@your-academy/shared';

export type AdminUserListItem = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
  avatarAssetId: string | null;
  lastHeartbeatAt: string | null;
  online: boolean;
  attemptCount: number;
  practiceAttemptCount: number;
  /** DEC-060 — derived per request. */
  subscription: SubscriptionSummary;
};

export type AdminUserDetail = {
  profile: {
    id: string;
    name: string;
    whatsappNumber: string;
    email: string | null;
    role: string;
    status: string;
    createdAt: string;
    onboardingCompletedAt: string | null;
    preferredCategoryIds: string[];
    avatarAssetId: string | null;
    online: boolean;
    lastHeartbeatAt: string | null;
  };
  subscription: SubscriptionSummary;
  study: {
    activeSeconds: number;
    sessionCount: number;
    attempts: number;
    correct: number;
    incorrect: number;
    practiceCompletes: number;
    practiceCorrect: number;
    practiceWrong: number;
    practiceSkipped?: number;
    practiceMarks?: number;
    practiceAvgPercent?: number;
    practiceBestPercent?: number;
    practiceTimeSeconds?: number;
  };
  recentPracticeAttempts?: Array<{
    id: string;
    status: string;
    submittedAt: string | null;
    elapsedSeconds: number | null;
    score: number | null;
    maxScore: number | null;
    percentScore: number | null;
    passed: boolean | null;
    correctCount: number | null;
    wrongCount: number | null;
    skippedCount: number | null;
    practiceSet: {
      id: string;
      title: string;
      kind: string;
      examTag: string | null;
      category: { id: string; name: string } | null;
    };
  }>;
  observedEngagement: Array<{
    categoryId: string;
    name: string;
    attempts: number;
    score: number;
  }>;
  sessions: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    lastHeartbeatAt: string;
    accruedSeconds: number;
    status: string;
    wallSeconds: number;
  }>;
  recentEvents: Array<{
    id: string;
    userId: string;
    type: string;
    occurredAt: string;
    subjectCategoryId: string | null;
    topicCategoryId: string | null;
    questionId: string | null;
    practiceSetId: string | null;
    practiceAttemptId: string | null;
    meta: unknown;
  }>;
};

export type ActivityOverview = {
  registered: number;
  online: number;
  sessionsActive: number;
  onlineBuckets: { m5: number; m15: number; m30: number };
  engagement: {
    today: { attempts: number; practiceCompletes: number; activeSeconds: number };
    d7: { attempts: number; practiceCompletes: number; activeSeconds: number };
    d30: { attempts: number; practiceCompletes: number; activeSeconds: number };
  };
  onlineHeartbeatWindowMs: number;
};

export type OnlineUserRow = {
  sessionId: string;
  startedAt: string;
  lastHeartbeatAt: string;
  accruedSeconds: number;
  user: {
    id: string;
    name: string;
    whatsappNumber: string;
    email: string | null;
    role: string;
    status: string;
  };
};

export type ActivityEventRow = {
  id: string;
  userId: string;
  type: string;
  occurredAt: string;
  subjectCategoryId: string | null;
  topicCategoryId: string | null;
  questionId: string | null;
  practiceSetId: string | null;
  practiceAttemptId: string | null;
  meta: unknown;
  user: { id: string; name: string; whatsappNumber: string };
};

export type ActivityTrends = {
  from: string;
  to: string;
  series: Array<{
    date: string;
    attempts: number;
    correct: number;
    practiceCompletes: number;
    activeSeconds: number;
  }>;
};

/** DEC-067 — `GET /admin/activity/kpis`. */
export type ActivityKpis = {
  registrations: { today: number; d7: number; d30: number };
  totalUsers: number;
  online: { now: number; m5: number; windowMs: number };
  dau: number;
  paid: {
    active: number;
    free: number;
    percent: number;
    newConversions: { d7: number; d30: number };
  };
  generatedAt: string;
};

/** DEC-067 — `GET /admin/activity/users/lookup`. */
export type UserLookupResult = {
  query: string;
  matchedBy: 'none' | 'id' | 'id-prefix' | 'text';
  items: Array<{
    id: string;
    name: string;
    email: string | null;
    whatsappNumber: string;
    role: string;
    status: string;
    createdAt: string;
    plan: 'PAID' | 'FREE' | 'STAFF';
    subscriptionEndsAt: string | null;
    lastActiveAt: string | null;
  }>;
};

/** DEC-067 — `GET /admin/audit`. */
export type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  actorRole: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
};

export type PurgeRequest = {
  target: 'audit' | 'activity' | 'all';
  mode: 'retention' | 'before' | 'range';
  before?: string;
  from?: string;
  to?: string;
};

export type PurgePreview = {
  criteria: { summary: string };
  counts: { audit: number; activity: number; total: number };
};
