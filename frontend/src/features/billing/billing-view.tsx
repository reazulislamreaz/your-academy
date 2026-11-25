'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  PACKAGE_DURATION_LABELS,
  type MySubscriptionDto,
  type PlanChangeKind,
  type SubscriptionPackageDto,
} from '@your-academy/shared';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { meQueryKey } from '@/features/auth/use-auth';
import {
  cancelRenewal,
  clearScheduledChange,
  getAccessConfig,
  getMySubscription,
  resumeRenewal,
  scheduleDowngrade,
} from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import { addMonthsIso, formatBdt, formatDate } from './format';
import { MyPaymentHistory, STATE_LABEL } from './my-plan-card';
import { PackageCard } from './packages-view';
import { useCheckout } from './use-checkout';

const CHANGE_LABEL: Record<PlanChangeKind, string> = {
  NEW: 'Subscribe',
  RENEW: 'Renew this plan',
  UPGRADE: 'Upgrade now',
  DOWNGRADE: 'Switch at renewal',
};

type Pending =
  | { kind: 'cancel' }
  | { kind: 'buy'; pkg: SubscriptionPackageDto; change: PlanChangeKind }
  | { kind: 'downgrade'; pkg: SubscriptionPackageDto };

/**
 * DEC-062 — learner "My Subscription": current plan, renew / upgrade (paid now, added on top
 * of the remaining time), downgrade (applied at the next renewal) and cancel renewal.
 * SSLCommerz recurring is not enabled, so nothing is ever charged automatically.
 */
export function BillingView() {
  const qc = useQueryClient();
  const mine = useQuery({ queryKey: ['my-subscription'], queryFn: getMySubscription });
  const config = useQuery({ queryKey: ['access-config'], queryFn: getAccessConfig });
  const checkout = useCheckout();
  const [pending, setPending] = useState<Pending | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = (data: MySubscriptionDto, message: string) => {
    qc.setQueryData(['my-subscription'], data);
    void qc.invalidateQueries({ queryKey: meQueryKey });
    setPending(null);
    setNotice(message);
  };
  const action = useMutation({
    mutationFn: (run: () => Promise<MySubscriptionDto>) => run(),
  });
  const run = (fn: () => Promise<MySubscriptionDto>, message: string) =>
    action.mutate(fn, { onSuccess: (data) => apply(data, message) });

  if (mine.isLoading) return <Skeleton className="h-72 w-full" />;
  if (mine.isError || !mine.data) {
    return (
      <LoadError message="Could not load your subscription." onRetry={() => void mine.refetch()} />
    );
  }

  const { subscription: sub, billing, isAdmin, payments } = mine.data;
  const paidOn = config.data?.paidSystemEnabled ?? true;
  const configured = config.data?.paymentsConfigured ?? true;
  const running = sub.state === 'ACTIVE' || sub.state === 'SCHEDULED';
  const renewal = billing.renewalPackage;
  const errorText =
    (action.error ?? checkout.error) instanceof ApiError
      ? ((action.error ?? checkout.error) as ApiError).message
      : action.error || checkout.error
        ? 'Something went wrong. Please try again.'
        : null;

  /** New end date after buying `pkg` now: added on top of the remaining time. */
  const endAfter = (pkg: SubscriptionPackageDto) =>
    addMonthsIso(running && sub.endsAt ? sub.endsAt : new Date().toISOString(), pkg.duration);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="My subscription"
        description="Your plan, renewal and plan changes. You are never charged automatically."
      />

      {notice ? <Alert variant="success">{notice}</Alert> : null}
      {errorText ? <Alert variant="danger">{errorText}</Alert> : null}
      {isAdmin ? <Alert variant="info">Admins have full access — no plan needed.</Alert> : null}
      {!isAdmin && config.data && !paidOn ? (
        <Alert variant="success">All content is free right now — no purchase needed.</Alert>
      ) : null}
      {!isAdmin && paidOn && config.data && !configured ? (
        <Alert variant="warning">
          Online payment is not configured yet. Please contact support to renew.
        </Alert>
      ) : null}

      {/* ── Current plan ─────────────────────────────────────────────────── */}
      <Surface className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={sub.state === 'ACTIVE' ? 'success' : 'outline'}>
            {STATE_LABEL[sub.state]}
          </Badge>
          <span className="font-display text-lg font-bold text-[var(--ink)]">
            {sub.packageName ?? (running ? 'Custom plan' : 'Free plan')}
          </span>
          {running ? (
            <Badge variant={sub.cancelAtPeriodEnd ? 'warning' : 'info'}>
              {sub.cancelAtPeriodEnd ? 'Renewal cancelled' : 'Renewal reminders on'}
            </Badge>
          ) : null}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[var(--muted)]">Started</dt>
            <dd className="font-semibold text-[var(--ink)]">
              {sub.startsAt ? formatDate(sub.startsAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">
              {running && !sub.cancelAtPeriodEnd
                ? 'Renewal due'
                : running
                  ? 'Access ends'
                  : 'Ended'}
            </dt>
            <dd className="font-semibold text-[var(--ink)]">
              {sub.endsAt ? formatDate(sub.endsAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Renews with</dt>
            <dd className="font-semibold text-[var(--ink)]">
              {!running || sub.cancelAtPeriodEnd
                ? '—'
                : renewal
                  ? `${renewal.name} · ${formatBdt(renewal.effectivePriceBdt)}`
                  : 'Choose a plan below'}
            </dd>
          </div>
        </dl>

        <p className="text-sm text-[var(--ink-soft)]">
          {sub.state === 'DISABLED'
            ? 'Your plan was disabled by an admin. Contact support if this is unexpected.'
            : !running
              ? sub.endsAt
                ? `Your plan ended on ${formatDate(sub.endsAt)}. Choose a plan below to get full access again.`
                : 'Choose a plan below to unlock every question set and paid Model Test.'
              : sub.cancelAtPeriodEnd && sub.endsAt
                ? `You cancelled renewal. You keep full access until ${formatDate(sub.endsAt)}, then your account returns to the free plan.`
                : `Renewing is manual: we email you 7 and 3 days before ${sub.endsAt ? formatDate(sub.endsAt) : 'the end date'}. Renewing early never loses days — the new period starts when the current one ends.`}
        </p>

        {billing.scheduledPackage && running ? (
          <Alert variant="info">
            <span>
              Switching to <strong>{billing.scheduledPackage.name}</strong> (
              {formatBdt(billing.scheduledPackage.effectivePriceBdt)} /{' '}
              {PACKAGE_DURATION_LABELS[billing.scheduledPackage.duration]}) at your next renewal
              {sub.endsAt ? ` on ${formatDate(sub.endsAt)}` : ''}. Until then nothing changes.
            </span>{' '}
            <Button
              size="sm"
              variant="ghost"
              disabled={action.isPending}
              onClick={() =>
                run(clearScheduledChange, 'Plan change cancelled — you keep your current plan.')
              }
            >
              Keep current plan
            </Button>
          </Alert>
        ) : null}

        {!isAdmin && paidOn ? (
          <div className="flex flex-wrap gap-2">
            {renewal && sub.state !== 'DISABLED' ? (
              <Button
                disabled={!configured || checkout.isPending}
                loading={checkout.isPending && checkout.buying === renewal.id}
                onClick={() =>
                  setPending({ kind: 'buy', pkg: renewal, change: running ? 'RENEW' : 'NEW' })
                }
              >
                Renew now · {formatBdt(renewal.effectivePriceBdt)}
              </Button>
            ) : null}
            {running && !sub.cancelAtPeriodEnd ? (
              <Button variant="outline" onClick={() => setPending({ kind: 'cancel' })}>
                Cancel renewal
              </Button>
            ) : null}
            {running && sub.cancelAtPeriodEnd ? (
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() =>
                  run(
                    resumeRenewal,
                    'Renewal turned back on. We will remind you before your plan ends.',
                  )
                }
              >
                Keep renewing
              </Button>
            ) : null}
          </div>
        ) : null}
      </Surface>

      {/* ── Plans ───────────────────────────────────────────────────────── */}
      {!isAdmin && paidOn && billing.options.length ? (
        <section className="space-y-3" aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="font-display text-lg font-bold tracking-tight">
            {running ? 'Change plan' : 'Plans'}
          </h2>
          {running ? (
            <p className="text-sm text-[var(--ink-soft)]">
              Upgrades start now and their time is added on top of your remaining days. Downgrades
              take effect at your next renewal.
            </p>
          ) : null}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {billing.options.map(({ package: pkg, change }) => {
              const isScheduled = billing.scheduledPackage?.id === pkg.id;
              return (
                <li key={pkg.id}>
                  <PackageCard
                    pkg={pkg}
                    action={
                      <div className="space-y-2">
                        {change === 'RENEW' ? (
                          <p className="text-xs font-semibold text-[var(--success-fg)]">
                            Your current plan
                          </p>
                        ) : null}
                        {change === 'DOWNGRADE' ? (
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={isScheduled || action.isPending}
                            onClick={() => setPending({ kind: 'downgrade', pkg })}
                          >
                            {isScheduled ? 'Scheduled for renewal' : CHANGE_LABEL.DOWNGRADE}
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            variant={
                              change === 'UPGRADE' || change === 'NEW' ? 'primary' : 'outline'
                            }
                            disabled={!configured || checkout.isPending || sub.state === 'DISABLED'}
                            loading={checkout.isPending && checkout.buying === pkg.id}
                            onClick={() => setPending({ kind: 'buy', pkg, change })}
                          >
                            {CHANGE_LABEL[change]}
                          </Button>
                        )}
                      </div>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <MyPaymentHistory payments={payments} />

      <p className="text-xs text-[var(--muted)]">
        Payments are processed securely by SSLCommerz (cards, bKash, Nagad, Rocket and more).
      </p>

      {/* ── Confirmations ───────────────────────────────────────────────── */}
      <ConfirmDialog
        open={pending?.kind === 'cancel'}
        title="Cancel renewal?"
        description={
          <span>
            You keep full access until{' '}
            <strong>{sub.endsAt ? formatDate(sub.endsAt) : 'the end date'}</strong>. After that your
            account returns to the free plan. You can turn renewal back on any time before then.
          </span>
        }
        confirmLabel="Cancel renewal"
        cancelLabel="Keep my plan"
        destructive
        reversible
        pending={action.isPending}
        onConfirm={() =>
          run(
            cancelRenewal,
            `Renewal cancelled. You keep full access until ${sub.endsAt ? formatDate(sub.endsAt) : 'the end date'}.`,
          )
        }
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending?.kind === 'downgrade'}
        title={pending?.kind === 'downgrade' ? `Switch to ${pending.pkg.name} at renewal?` : ''}
        description={
          pending?.kind === 'downgrade' ? (
            <span>
              Nothing changes now — you keep <strong>{sub.packageName ?? 'your plan'}</strong> until{' '}
              <strong>{sub.endsAt ? formatDate(sub.endsAt) : 'it ends'}</strong>. When you renew,
              you will pay <strong>{formatBdt(pending.pkg.effectivePriceBdt)}</strong> for{' '}
              {PACKAGE_DURATION_LABELS[pending.pkg.duration]}.
            </span>
          ) : null
        }
        confirmLabel="Schedule change"
        reversible
        pending={action.isPending}
        onConfirm={() => {
          if (pending?.kind !== 'downgrade') return;
          const pkg = pending.pkg;
          run(() => scheduleDowngrade(pkg.id), `${pkg.name} will be used at your next renewal.`);
        }}
        onCancel={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending?.kind === 'buy'}
        title={
          pending?.kind === 'buy'
            ? pending.change === 'UPGRADE'
              ? `Upgrade to ${pending.pkg.name}?`
              : pending.change === 'RENEW'
                ? `Renew ${pending.pkg.name}?`
                : `Subscribe to ${pending.pkg.name}?`
            : ''
        }
        description={
          pending?.kind === 'buy' ? (
            <span>
              You pay <strong>{formatBdt(pending.pkg.effectivePriceBdt)}</strong> once, now (no
              automatic charges).{' '}
              {running && sub.endsAt ? (
                <>
                  {PACKAGE_DURATION_LABELS[pending.pkg.duration]} is added on top of your current
                  end date — full access until <strong>{formatDate(endAfter(pending.pkg))}</strong>
                  {pending.change === 'UPGRADE'
                    ? `, and your plan becomes ${pending.pkg.name} right away`
                    : ''}
                  .
                </>
              ) : (
                <>
                  Full access starts as soon as the payment is confirmed and runs until about{' '}
                  <strong>{formatDate(endAfter(pending.pkg))}</strong>.
                </>
              )}
            </span>
          ) : null
        }
        confirmLabel="Continue to payment"
        pending={checkout.isPending}
        onConfirm={() => {
          if (pending?.kind !== 'buy') return;
          checkout.mutate(pending.pkg.id);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
