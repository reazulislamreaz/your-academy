/**
 * DEC-060 — Free vs Paid system + SSLCommerz. Browser-safe contracts shared by the
 * API and the web app (no secrets, no Prisma types).
 */

export type ContentAccessLevel = 'FREE' | 'PAID';
export type PackageDuration = 'MONTHLY' | 'SIX_MONTHS' | 'YEARLY';
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
  | 'MIGRATED';

export const PACKAGE_DURATION_MONTHS: Readonly<Record<PackageDuration, number>> = {
  MONTHLY: 1,
  SIX_MONTHS: 6,
  YEARLY: 12,
};

export const PACKAGE_DURATION_LABELS: Readonly<Record<PackageDuration, string>> = {
  MONTHLY: 'Monthly',
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
  /** Admin, paid system OFF, or an active subscriber. */
  fullAccess: boolean;
  /** Active subscription right now. */
  isPaid: boolean;
  subscriptionEndsAt: string | null;
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
  /** Decimal string in BDT, e.g. "499.00" — never a float. */
  priceBdt: string;
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
