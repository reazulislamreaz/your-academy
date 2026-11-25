'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, CalendarPlus, Plus } from 'lucide-react';
import {
  PACKAGE_DURATION_LABELS,
  type AdminUserSubscriptionDetail,
  type SubscriptionEventAction,
  type SubscriptionEventSource,
} from '@your-academy/shared';
import { AdminPage, AdminSection } from '@/components/admin/admin-page';
import {
  AdminEmptyRow,
  AdminTable,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-table';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import {
  PaymentStatusBadge,
  SubscriptionStateBadge,
  errorMessage,
  formatBdt,
  formatDate,
  formatDateTime,
} from '@/features/admin/billing/billing-format';
import {
  ExtendDialog,
  GrantDialog,
  type GrantInput,
} from '@/features/admin/billing/subscriber-dialogs';
import { adminBillingApi } from '@/lib/api/admin-billing';

const ACTION_LABELS: Record<SubscriptionEventAction, string> = {
  GRANT: 'Granted (package)',
  EXTEND: 'Extended',
  SET_END: 'End date set',
  DISABLE: 'Disabled',
  ENABLE: 'Re-enabled',
  PURCHASE: 'Purchased',
  MIGRATED: 'Migrated from old system',
  CANCEL: 'Renewal cancelled by user',
  RESUME: 'Renewal resumed by user',
  SCHEDULE_CHANGE: 'Downgrade scheduled by user',
  CLEAR_SCHEDULED_CHANGE: 'Scheduled downgrade removed',
};

const SOURCE_VARIANT: Record<SubscriptionEventSource, 'info' | 'success' | 'default'> = {
  MANUAL: 'info',
  PAYMENT: 'success',
  MIGRATION: 'default',
};

/** DEC-060 — one user's subscription: grant / extend / disable, change log, payments. */
export default function AdminSubscriberDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const qc = useQueryClient();
  const queryKey = ['admin-subscriber', userId];
  const detail = useQuery({
    queryKey,
    queryFn: () => adminBillingApi.getSubscriber(userId),
    enabled: Boolean(userId),
  });
  const packages = useQuery({
    queryKey: ['admin-packages'],
    queryFn: adminBillingApi.listPackages,
  });
  const [grantOpen, setGrantOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  const applied = (text: string) => (data: AdminUserSubscriptionDetail) => {
    qc.setQueryData(queryKey, data);
    void qc.invalidateQueries({ queryKey: ['admin-subscribers'] });
    void qc.invalidateQueries({ queryKey: ['admin-user', userId] });
    void qc.invalidateQueries({ queryKey: ['admin-users'] });
    setDialogError(null);
    setGrantOpen(false);
    setExtendOpen(false);
    setMessage({ kind: 'success', text });
  };

  const grant = useMutation({
    mutationFn: (input: GrantInput) => adminBillingApi.grant(userId, input),
    onSuccess: applied('Subscription granted.'),
    onError: (err) => setDialogError(errorMessage(err, 'Could not grant the subscription')),
  });
  const extend = useMutation({
    mutationFn: (input: { days: number; note?: string }) => adminBillingApi.extend(userId, input),
    onSuccess: applied('Subscription extended.'),
    onError: (err) => setDialogError(errorMessage(err, 'Could not extend the subscription')),
  });
  const disable = useMutation({
    mutationFn: () => adminBillingApi.disable(userId),
    onSuccess: applied('Subscription disabled — access removed immediately.'),
    onError: (err) => setMessage({ kind: 'danger', text: errorMessage(err, 'Could not disable') }),
  });
  const enable = useMutation({
    mutationFn: () => adminBillingApi.enable(userId),
    onSuccess: applied('Subscription re-enabled.'),
    onError: (err) => setMessage({ kind: 'danger', text: errorMessage(err, 'Could not enable') }),
  });

  if (detail.isLoading) {
    return (
      <AdminPage>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </AdminPage>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <LoadError message="Could not load this subscriber." onRetry={() => void detail.refetch()} />
    );
  }

  const { user, subscription, events, payments } = detail.data;
  const isAdmin = user.role === 'ADMIN';
  const disabled = subscription.state === 'DISABLED';
  const hasRow = subscription.state !== 'FREE';

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Billing"
        title={user.name}
        description={`${user.whatsappNumber}${user.email ? ` · ${user.email}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/subscribers">
              <Button size="sm" variant="outline">
                <ArrowLeft className="size-4" aria-hidden />
                Subscribers
              </Button>
            </Link>
            <Link href={`/admin/users/${user.id}`}>
              <Button size="sm" variant="ghost">
                User profile
              </Button>
            </Link>
          </div>
        }
      />

      {message ? <Alert variant={message.kind}>{message.text}</Alert> : null}

      <AdminSection title="Subscription">
        <Surface className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SubscriptionStateBadge state={subscription.state} />
            {subscription.packageName ? (
              <span className="font-semibold text-[var(--ink)]">{subscription.packageName}</span>
            ) : hasRow ? (
              <span className="text-[var(--ink-soft)]">Custom grant</span>
            ) : null}
          </div>
          {subscription.cancelAtPeriodEnd || subscription.scheduledPackageName ? (
            <p className="text-sm text-[var(--ink-soft)]">
              {subscription.cancelAtPeriodEnd
                ? `User cancelled renewal${subscription.canceledAt ? ` on ${formatDate(subscription.canceledAt)}` : ''} — access continues until the expiry date.`
                : `User scheduled a switch to ${subscription.scheduledPackageName} at next renewal.`}
            </p>
          ) : null}
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[var(--muted)]">Started</dt>
              <dd className="text-[var(--ink)]">{formatDate(subscription.startsAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Expires</dt>
              <dd className="text-[var(--ink)]">{formatDateTime(subscription.endsAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Disabled</dt>
              <dd className="text-[var(--ink)]">{formatDateTime(subscription.disabledAt)}</dd>
            </div>
          </dl>
          {isAdmin ? (
            <Alert>Admins always have full access — no subscription needed.</Alert>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setDialogError(null);
                  setGrantOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden />
                Make paid / grant
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDialogError(null);
                  setExtendOpen(true);
                }}
              >
                <CalendarPlus className="size-4" aria-hidden />
                Extend
              </Button>
              {hasRow && !disabled ? (
                <ConfirmButton
                  size="sm"
                  variant="danger"
                  confirmTitle="Disable this subscription?"
                  confirmMessage="The user loses paid access immediately. The end date is kept so you can re-enable it later."
                  confirmLabel="Disable"
                  reversible
                  onConfirm={() => disable.mutateAsync()}
                >
                  Disable / revoke
                </ConfirmButton>
              ) : null}
              {disabled ? (
                <ConfirmButton
                  size="sm"
                  variant="secondary"
                  confirmTitle="Re-enable this subscription?"
                  confirmMessage="Paid access returns immediately if the end date is still in the future."
                  confirmLabel="Re-enable"
                  destructive={false}
                  reversible
                  onConfirm={() => enable.mutateAsync()}
                >
                  Re-enable
                </ConfirmButton>
              ) : null}
            </div>
          )}
        </Surface>
      </AdminSection>

      <AdminSection
        title="Change log"
        description="Every subscription change — manual, payment, or migration."
      >
        <AdminTableShell minWidth="48rem">
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>When</AdminTh>
                <AdminTh>What</AdminTh>
                <AdminTh>Source</AdminTh>
                <AdminTh>By</AdminTh>
                <AdminTh>End date</AdminTh>
                <AdminTh>Note</AdminTh>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <AdminEmptyRow colSpan={6}>No subscription changes yet.</AdminEmptyRow>
              ) : (
                events.map((e) => (
                  <tr key={e.id}>
                    <AdminTd muted className="text-xs whitespace-nowrap">
                      {formatDateTime(e.createdAt)}
                    </AdminTd>
                    <AdminTd className="text-sm">
                      {ACTION_LABELS[e.action]}
                      {e.packageName ? (
                        <span className="text-[var(--muted-strong)]"> · {e.packageName}</span>
                      ) : null}
                      {e.tranId ? (
                        <p className="font-mono text-xs text-[var(--muted-strong)]">{e.tranId}</p>
                      ) : null}
                    </AdminTd>
                    <AdminTd>
                      <Badge variant={SOURCE_VARIANT[e.source]}>{e.source.toLowerCase()}</Badge>
                    </AdminTd>
                    <AdminTd className="text-sm">
                      {e.actor?.name ?? (e.source === 'PAYMENT' ? 'SSLCommerz' : '—')}
                    </AdminTd>
                    <AdminTd muted className="text-xs whitespace-nowrap">
                      {e.previousEndsAt ? `${formatDate(e.previousEndsAt)} → ` : ''}
                      {formatDate(e.newEndsAt)}
                    </AdminTd>
                    <AdminTd muted className="max-w-[16rem] text-xs break-words">
                      {e.note ?? '—'}
                    </AdminTd>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      </AdminSection>

      <AdminSection title="Payments">
        <AdminTableShell minWidth="44rem">
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Date</AdminTh>
                <AdminTh>tran_id</AdminTh>
                <AdminTh>Package</AdminTh>
                <AdminTh>Amount</AdminTh>
                <AdminTh>Status</AdminTh>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <AdminEmptyRow colSpan={5}>No payments.</AdminEmptyRow>
              ) : (
                payments.map((p) => (
                  <tr key={p.tranId}>
                    <AdminTd muted className="text-xs whitespace-nowrap">
                      {formatDateTime(p.createdAt)}
                    </AdminTd>
                    <AdminTd className="font-mono text-xs">
                      <Link
                        href={`/admin/payments?q=${encodeURIComponent(p.tranId)}`}
                        className="hover:underline"
                      >
                        {p.tranId}
                      </Link>
                    </AdminTd>
                    <AdminTd className="text-sm">
                      {p.packageName} · {PACKAGE_DURATION_LABELS[p.duration]}
                    </AdminTd>
                    <AdminTd className="whitespace-nowrap">{formatBdt(p.amount)}</AdminTd>
                    <AdminTd>
                      <PaymentStatusBadge status={p.status} />
                    </AdminTd>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      </AdminSection>

      <GrantDialog
        open={grantOpen}
        packages={packages.data ?? []}
        pending={grant.isPending}
        error={dialogError}
        onSubmit={(input) => grant.mutate(input)}
        onClose={() => {
          if (!grant.isPending) setGrantOpen(false);
        }}
      />
      <ExtendDialog
        open={extendOpen}
        pending={extend.isPending}
        error={dialogError}
        onSubmit={(input) => extend.mutate(input)}
        onClose={() => {
          if (!extend.isPending) setExtendOpen(false);
        }}
      />
    </AdminPage>
  );
}
