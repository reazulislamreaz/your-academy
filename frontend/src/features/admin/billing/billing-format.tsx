import type {
  PaymentOrderStatus,
  SubscriptionState,
  SubscriptionSummary,
} from '@your-academy/shared';
import { Badge } from '@/components/ui/badge';
import { ApiError } from '@/lib/api/client';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline';

export const SUBSCRIPTION_STATE_LABELS: Record<SubscriptionState, string> = {
  FREE: 'Free',
  ACTIVE: 'Active',
  SCHEDULED: 'Scheduled',
  EXPIRED: 'Expired',
  DISABLED: 'Disabled',
};

const STATE_VARIANT: Record<SubscriptionState, BadgeVariant> = {
  FREE: 'outline',
  ACTIVE: 'success',
  SCHEDULED: 'info',
  EXPIRED: 'default',
  DISABLED: 'danger',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  PENDING: 'Pending',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  RISK: 'Risk / hold',
  REFUNDED: 'Refunded',
};

const PAYMENT_VARIANT: Record<PaymentOrderStatus, BadgeVariant> = {
  PENDING: 'info',
  SUCCESS: 'success',
  FAILED: 'danger',
  CANCELLED: 'default',
  RISK: 'warning',
  REFUNDED: 'outline',
};

export function SubscriptionStateBadge({ state }: { state: SubscriptionState }) {
  return <Badge variant={STATE_VARIANT[state]}>{SUBSCRIPTION_STATE_LABELS[state]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentOrderStatus }) {
  return <Badge variant={PAYMENT_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

/** Decimal string from the API ("499.00") — formatted without float math. */
export function formatBdt(amount: string): string {
  const [whole = '0', frac = '00'] = amount.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `৳${grouped}${frac === '00' ? '' : `.${frac.padEnd(2, '0').slice(0, 2)}`}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function subscriptionLabel(s: SubscriptionSummary): string {
  const state = SUBSCRIPTION_STATE_LABELS[s.state];
  if (!s.endsAt) return state;
  return `${state} · ${s.packageName ?? 'Custom'} · until ${formatDate(s.endsAt)}`;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** `YYYY-MM-DD` in the admin's local time zone (for `<input type="date">`). */
export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
