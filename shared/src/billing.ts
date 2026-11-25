/**
 * DEC-060 — Free vs Paid system + SSLCommerz. Browser-safe contracts shared by the
 * API and the web app (no secrets, no Prisma types).
 */

export type ContentAccessLevel = 'FREE' | 'PAID';
/** MONTHLY is legacy (DEC-062) — kept so old orders / packages still read. */
export type PackageDuration = 'MONTHLY' | 'THREE_MONTHS' | 'SIX_MONTHS' | 'YEARLY';
/** Lengths an admin can sell (DEC-062: 3 Months replaced Monthly). */
export const SELLABLE_PACKAGE_DURATIONS: readonly PackageDuration[] = [
  'THREE_MONTHS',
  'SIX_MONTHS',
  'YEARLY',
];
export type PaymentOrderStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'RISK'
  | 'REFUNDED';
/** Derived per request — never stored. SCHEDULED = start date still in the future. */
export type SubscriptionState = 'FREE' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DISABLED';
export const SUBSCRIPTION_STATES: readonly SubscriptionState[] = [
  'FREE',
  'ACTIVE',
  'SCHEDULED',
  'EXPIRED',
  'DISABLED',
];
export type SubscriptionEventSource = 'MANUAL' | 'PAYMENT' | 'MIGRATION';
export type SubscriptionEventAction =
  | 'GRANT'
  | 'EXTEND'
  | 'SET_END'
  | 'DISABLE'
  | 'ENABLE'
  | 'PURCHASE'
  | 'MIGRATED'
  | 'CANCEL'
  | 'RESUME'
  | 'SCHEDULE_CHANGE'
  | 'CLEAR_SCHEDULED_CHANGE';

export const PACKAGE_DURATION_MONTHS: Readonly<Record<PackageDuration, number>> = {
  MONTHLY: 1,
  THREE_MONTHS: 3,
  SIX_MONTHS: 6,
  YEARLY: 12,
};

export const PACKAGE_DURATION_LABELS: Readonly<Record<PackageDuration, string>> = {
  MONTHLY: 'Monthly',
  THREE_MONTHS: '3 Months',
  SIX_MONTHS: '6 Months',
  YEARLY: '1 Year',
};

/** Error code returned (HTTP 403) for content a free user cannot open. */
export const CONTENT_LOCKED = 'CONTENT_LOCKED';
/** `error.details[0]` of a CONTENT_LOCKED error. */
export type ContentLockedDetail = {
  reason: 'PAID_REQUIRED';
  /** True for anonymous visitors — the UI offers sign-in before the Packages page. */
  loginRequired: boolean;
};

/** `user.access` on /auth/me — UX only; the API enforces every lock itself. */
export type UserAccessSnapshot = {
  paidSystemEnabled: boolean;
  /** Admin, paid system OFF, or an active subscriber. The trial never sets this (DEC-063). */
  fullAccess: boolean;
  /** Active subscription right now. */
  isPaid: boolean;
  subscriptionEndsAt: string | null;
  /** DEC-061 / DEC-063 — 7-day trial from account creation (server time); Topic Base only. */
  isTrialActive: boolean;
  /** DEC-063 — may open Topic Base questions: fullAccess or a running trial. */
  topicAccess: boolean;
  trialEndsAt: string | null;
  /** Whole days left, rounded up; 0 when ended. */
  trialDaysLeft: number;
};

/** Paid-system switches (admin dashboard → Subscription settings). */
export type SiteAccessSettings = {
  paidSystemEnabled: boolean;
  preliFreeSetCount: number;
  writtenFreeSetCount: number;
  updatedAt: string;
};

/** Public flags the web app needs (no counts of other users, no secrets). */
export type PublicAccessConfig = {
  paidSystemEnabled: boolean;
  /** False when SSLCommerz credentials are not set — Buy buttons explain why. */
  paymentsConfigured: boolean;
};

export type SubscriptionPackageDto = {
  id: string;
  name: string;
  duration: PackageDuration;
  /** Decimal string in BDT, e.g. "499.00" — never a float. Regular (list) price. */
  priceBdt: string;
  /** DEC-062 — sale price when set; always below priceBdt. */
  discountedPriceBdt: string | null;
  /** What checkout charges: discountedPriceBdt ?? priceBdt. */
  effectivePriceBdt: string;
  /** DEC-062 — "Popular" badge. */
  isPopular: boolean;
  description: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminSubscriptionPackageDto = SubscriptionPackageDto & {
  /** Orders reference it → delete becomes a soft delete. */
  orderCount: number;
};

export type SubscriptionSummary = {
  state: SubscriptionState;
  packageName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  disabledAt: string | null;
  /** DEC-062 — learner turned renewal off; access still runs until endsAt. */
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  /** DEC-062 — downgrade bought at the next renewal. */
  scheduledPackageName: string | null;
};

/**
 * DEC-062 — how buying `pkg` relates to the current plan.
 * UPGRADE = pay now, duration added on top of the remaining time.
 * DOWNGRADE = scheduled; bought when the learner next renews.
 * RENEW = same plan, adds its duration. NEW = no running plan (or no known current plan).
 */
export type PlanChangeKind = 'NEW' | 'RENEW' | 'UPGRADE' | 'DOWNGRADE';

/** Learner billing page (`GET /me/subscription`). */
export type MyBillingDetail = {
  packageId: string | null;
  scheduledPackage: SubscriptionPackageDto | null;
  /** Plan the Renew button buys: scheduled downgrade, else the current plan (if still sold). */
  renewalPackage: SubscriptionPackageDto | null;
  /** Every plan on sale with how it relates to the current one. */
  options: { package: SubscriptionPackageDto; change: PlanChangeKind }[];
};

export type PaymentOrderDto = {
  tranId: string;
  packageName: string;
  duration: PackageDuration;
  amount: string;
  currency: string;
  status: PaymentOrderStatus;
  createdAt: string;
  validatedAt: string | null;
};

export type MySubscriptionDto = {
  /** Admins have full access without a subscription. */
  isAdmin: boolean;
  subscription: SubscriptionSummary;
  payments: PaymentOrderDto[];
  /** DEC-062 — plan management (upgrade / downgrade / cancel / renew). */
  billing: MyBillingDetail;
};

export type AdminPaymentOrderDto = PaymentOrderDto & {
  id: string;
  valId: string | null;
  bankTranId: string | null;
  cardType: string | null;
  gatewayStatus: string | null;
  riskLevel: number | null;
  riskTitle: string | null;
  failureReason: string | null;
  appliedAt: string | null;
  lastCheckedAt: string | null;
  user: { id: string; name: string; whatsappNumber: string; email: string | null };
};

export type SubscriptionEventDto = {
  id: string;
  source: SubscriptionEventSource;
  action: SubscriptionEventAction;
  packageName: string | null;
  tranId: string | null;
  previousEndsAt: string | null;
  newEndsAt: string | null;
  note: string | null;
  actor: { id: string; name: string } | null;
  createdAt: string;
};

export type AdminSubscriberRow = {
  user: {
    id: string;
    name: string;
    whatsappNumber: string;
    email: string | null;
    role: string;
    createdAt: string;
  };
  subscription: SubscriptionSummary;
};

export type AdminUserSubscriptionDetail = AdminSubscriberRow & {
  events: SubscriptionEventDto[];
  payments: PaymentOrderDto[];
};

/** Result of `POST /payments/checkout`. */
export type CheckoutResult = { tranId: string; gatewayUrl: string };

/** Safe for the logged-out result page: looked up by the unguessable tran_id. */
export type PaymentOrderPublicStatus = {
  tranId: string;
  status: PaymentOrderStatus;
  packageName: string;
  amount: string;
  currency: string;
  /** Set once the subscription was extended by this order. */
  subscriptionEndsAt: string | null;
};

/** Preli Practice scoring (server-side). */
export type PublicPracticeScoreItem = {
  id: string;
  selectedOptionId: string | null;
  isSkipped: boolean;
  isCorrect: boolean;
  correctOptionId: string | null;
  correctAnswerLabel: string;
};

export type PublicPracticeScore = {
  setId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number;
  percent: number;
  answerSheet: PublicPracticeScoreItem[];
};
