'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import type { PaymentOrderDto, PaymentOrderStatus, SubscriptionState } from '@your-academy/shared';
import { LoadError } from '@/components/loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { useMe } from '@/features/auth/use-auth';
import { getAccessConfig, getMySubscription } from '@/lib/api/billing';
import { formatBdt, formatDate, formatDateTime } from './format';

export const STATE_LABEL: Record<SubscriptionState, string> = {
  FREE: 'Free',
  ACTIVE: 'Active',
  SCHEDULED: 'Starts soon',
  EXPIRED: 'Expired',
  DISABLED: 'Disabled',
};

const PAYMENT_BADGE: Record<PaymentOrderStatus, 'success' | 'warning' | 'danger' | 'outline'> = {
  SUCCESS: 'success',
  PENDING: 'warning',
  RISK: 'warning',
  FAILED: 'danger',
  CANCELLED: 'outline',
  REFUNDED: 'outline',
};

const PAYMENT_LABEL: Record<PaymentOrderStatus, string> = {
  SUCCESS: 'Paid',
  PENDING: 'Pending',
  RISK: 'Under review',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

/** DEC-060 — profile: current plan, expiry and payment history. */
export function MyPlanCard() {
  const mine = useQuery({ queryKey: ['my-subscription'], queryFn: getMySubscription });
  const trial = useMe().data?.access;
  const config = useQuery({ queryKey: ['access-config'], queryFn: getAccessConfig });

  if (mine.isLoading) return <Skeleton className="h-40 w-full" />;
  if (mine.isError || !mine.data) {
    return <LoadError message="Could not load your plan." onRetry={() => void mine.refetch()} />;
  }
  const { subscription: sub, payments, isAdmin } = mine.data;
  const paidOn = config.data?.paidSystemEnabled ?? true;

  return (
    <section className="space-y-3" aria-labelledby="my-plan-heading">
      <h2 id="my-plan-heading" className="font-display text-lg font-bold tracking-tight">
        My plan
      </h2>
      <Surface className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={sub.state === 'ACTIVE' ? 'success' : 'outline'}>
            {STATE_LABEL[sub.state]}
          </Badge>
          {sub.packageName ? (
            <span className="text-sm font-semibold text-[var(--ink)]">{sub.packageName}</span>
          ) : null}
        </div>
        <p className="text-sm text-[var(--ink-soft)]">
          {isAdmin
            ? 'Admins have full access to everything.'
            : !paidOn
              ? 'All content is free right now.'
              : sub.state !== 'ACTIVE' && trial?.isTrialActive && trial.trialEndsAt
                ? `Free plan, plus Topic-Based questions free until ${formatDate(trial.trialEndsAt)} (${trial.trialDaysLeft} ${trial.trialDaysLeft === 1 ? 'day' : 'days'} left).`
                : sub.state === 'ACTIVE' && sub.endsAt
                  ? `Full access until ${formatDate(sub.endsAt)}.`
                  : sub.state === 'SCHEDULED' && sub.startsAt
                    ? `Your plan starts on ${formatDate(sub.startsAt)}.`
                    : sub.state === 'EXPIRED' && sub.endsAt
                      ? `Your plan ended on ${formatDate(sub.endsAt)}. You are on the free plan.`
                      : sub.state === 'DISABLED'
                        ? 'Your plan was disabled by an admin. Contact support if this is unexpected.'
                        : 'You are on the free plan: the first sets of each bank and free Model Tests are open.'}
        </p>
        {!isAdmin && paidOn ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/billing">
              <Button size="sm" variant={sub.state === 'ACTIVE' ? 'outline' : 'primary'}>
                {sub.state === 'ACTIVE' ? 'Manage subscription' : 'See plans'}
              </Button>
            </Link>
          </div>
        ) : null}
      </Surface>

      <MyPaymentHistory payments={payments} />
    </section>
  );
}

/** Learner's own SSLCommerz orders (profile + billing page). */
export function MyPaymentHistory({ payments }: { payments: PaymentOrderDto[] }) {
  return (
    <div className="space-y-3">
      <h3 className="pt-2 text-sm font-semibold text-[var(--ink)]">Payment history</h3>
      {payments.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No payments yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
          {payments.map((p) => (
            <li
              key={p.tranId}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold break-words text-[var(--ink)]">
                  {p.packageName}
                </span>
                <span className="block text-xs text-[var(--muted)]">
                  {formatDateTime(p.createdAt)} ·{' '}
                  <span className="font-mono break-all">{p.tranId}</span>
                </span>
              </span>
              <span className="font-semibold tabular-nums">{formatBdt(p.amount)}</span>
              <Badge variant={PAYMENT_BADGE[p.status]}>{PAYMENT_LABEL[p.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
