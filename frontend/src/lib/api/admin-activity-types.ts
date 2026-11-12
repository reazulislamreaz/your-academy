export type AdminUserListItem = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  role: string;
  status: string;
  trialEndsAt: string;
  trialStartedAt: string;
  trialActive: boolean;
  createdAt: string;
  avatarAssetId: string | null;
  lastHeartbeatAt: string | null;
  online: boolean;
  attemptCount: number;
  practiceAttemptCount: number;
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    plan: { id: string; code: string; name: string };
  } | null;
};

export type AdminUserDetail = {
  profile: {
    id: string;
    name: string;
    whatsappNumber: string;
    email: string | null;
    role: string;
    status: string;
    trialStartedAt: string;
    trialEndsAt: string;
    trialActive: boolean;
    createdAt: string;
    onboardingCompletedAt: string | null;
    preferredCategoryIds: string[];
    avatarAssetId: string | null;
    online: boolean;
    lastHeartbeatAt: string | null;
  };
  subscription: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    canceledAt: string | null;
    plan: { id: string; code: string; name: string; durationDays: number };
  } | null;
  subscriptions: Array<{
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    canceledAt: string | null;
    plan: { id: string; code: string; name: string; durationDays: number };
  }>;
  study: {
    activeSeconds: number;
    sessionCount: number;
    attempts: number;
    correct: number;
    incorrect: number;
    practiceCompletes: number;
    practiceCorrect: number;
    practiceWrong: number;
  };
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
