'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AdminPaymentOrderDto, PaymentOrderStatus } from '@your-academy/shared';
import { AdminListMeta, AdminPage, AdminToolbar } from '@/components/admin/admin-page';
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
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Input } from '@/components/ui/input';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PAYMENT_STATUS_LABELS,
  PaymentStatusBadge,
  errorMessage,
  formatBdt,
  formatDateTime,
} from '@/features/admin/billing/billing-format';
import { PaymentDetailsDialog } from '@/features/admin/billing/payment-details-dialog';
import { adminBillingApi, type PaymentActionOutcome } from '@/lib/api/admin-billing';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

const STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentOrderStatus[];

const OUTCOME_TEXT: Record<string, string> = {
  APPLIED: 'Payment confirmed — subscription extended.',
  ALREADY_APPLIED: 'Already applied — nothing changed.',
  PENDING: 'Still pending at the gateway.',
  GATEWAY_UNAVAILABLE: 'SSLCommerz did not respond — try again later.',
  RISK: 'Gateway flagged this payment (risk) — held for review.',
  FAILED: 'Marked failed.',
  CANCELLED: 'Marked cancelled.',
  REJECTED: 'Validation failed — not applied (see the log).',
};

/** DEC-060 — all SSLCommerz transactions with re-check / approve / refund bookkeeping. */
export default function AdminPaymentsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const qApplied = useDebouncedValue(q.trim(), 350);
  const [status, setStatus] = useState<'' | PaymentOrderStatus>('');
  const [packageId, setPackageId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<AdminPaymentOrderDto | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: 'success' | 'danger' | 'info';
    text: string;
  } | null>(null);
  const packages = useQuery({
    queryKey: ['admin-packages'],
    queryFn: adminBillingApi.listPackages,
  });

  // Deep link from a subscriber page: /admin/payments?q=<tran_id>
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('q');
    if (initial) setQ(initial);
  }, []);

  const list = useCursorList<AdminPaymentOrderDto>(
    ['admin-payments', qApplied, status, packageId, from, to],
    (cursor) => {
      const params = new URLSearchParams({ limit: '30' });
      if (qApplied) params.set('q', qApplied);
      if (status) params.set('status', status);
      if (packageId) params.set('packageId', packageId);
      // Local calendar days → [from 00:00, day after `to` 00:00).
      if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString());
      if (to) {
        const end = new Date(`${to}T00:00:00`);
        end.setDate(end.getDate() + 1);
        params.set('to', end.toISOString());
      }
      if (cursor) params.set('cursor', cursor);
      return `/admin/payments?${params}`;
    },
  );
  const total = list.data?.pages[0]?.pagination?.total ?? null;

  const afterAction = (res: PaymentActionOutcome) => {
    void qc.invalidateQueries({ queryKey: ['admin-payments'] });
    void qc.invalidateQueries({ queryKey: ['admin-payment-logs', res.order.id] });
    void qc.invalidateQueries({ queryKey: ['admin-subscriber', res.order.user.id] });
    void qc.invalidateQueries({ queryKey: ['admin-subscribers'] });
    setSelected((cur) => (cur && cur.id === res.order.id ? res.order : cur));
    setDialogError(null);
    setMessage({
      kind: res.outcome === 'APPLIED' ? 'success' : 'info',
      text: `${res.order.tranId}: ${OUTCOME_TEXT[res.outcome] ?? res.outcome}`,
    });
  };

  const recheck = useMutation({
    mutationFn: (id: string) => adminBillingApi.recheckPayment(id),
    onSuccess: afterAction,
    onError: (err) => {
      const text = errorMessage(err, 'Re-check failed');
      setDialogError(text);
      setMessage({ kind: 'danger', text });
    },
  });
  const approve = useMutation({
    mutationFn: (id: string) => adminBillingApi.approvePayment(id),
    onSuccess: afterAction,
    onError: (err) => setMessage({ kind: 'danger', text: errorMessage(err, 'Approve failed') }),
  });
  const refund = useMutation({
    mutationFn: (id: string) => adminBillingApi.markRefunded(id),
    onSuccess: (order) => {
      void qc.invalidateQueries({ queryKey: ['admin-payments'] });
      setMessage({
        kind: 'success',
        text: `${order.tranId} marked refunded. The user's access was not changed — disable it on the subscriber page if needed.`,
      });
    },
    onError: (err) => setMessage({ kind: 'danger', text: errorMessage(err, 'Update failed') }),
  });

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        description="Every SSLCommerz transaction. Pending orders are re-checked automatically; use Re-check to ask the gateway now."
      />

      <AdminToolbar>
        <div className="admin-filter-grid">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="tran_id, val_id, name, WhatsApp, email"
            aria-label="Search payments"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | PaymentOrderStatus)}
            className="h-10 w-full sm:w-40"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="h-10 w-full sm:w-48"
            aria-label="Filter by package"
          >
            <option value="">All packages</option>
            {(packages.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            className="h-10 w-full sm:w-40"
            aria-label="From date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            className="h-10 w-full sm:w-40"
            aria-label="To date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </AdminToolbar>

      {message ? <Alert variant={message.kind}>{message.text}</Alert> : null}
      {list.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {list.error ? (
        <LoadError message="Could not load payments." onRetry={() => void list.refetch()} />
      ) : null}

      {!list.isLoading && list.data ? (
        <AdminTableShell
          minWidth="64rem"
          header={
            <AdminListMeta
              count={total ?? list.items.length}
              noun="payment"
              hasMore={total === null && list.hasNextPage}
              query={qApplied || undefined}
            />
          }
          footer={
            <LoadMoreButton
              hasNextPage={list.hasNextPage}
              isFetchingNextPage={list.isFetchingNextPage}
              onLoadMore={() => void list.fetchNextPage()}
            />
          }
        >
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Date</AdminTh>
                <AdminTh>tran_id / val_id</AdminTh>
                <AdminTh>User</AdminTh>
                <AdminTh>Package</AdminTh>
                <AdminTh>Amount</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh align="right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 ? (
                <AdminEmptyRow colSpan={7}>No payments match these filters.</AdminEmptyRow>
              ) : (
                list.items.map((p) => (
                  <tr key={p.id}>
                    <AdminTd muted className="text-xs whitespace-nowrap">
                      {formatDateTime(p.createdAt)}
                    </AdminTd>
                    <AdminTd className="max-w-[14rem] font-mono text-xs">
                      <p className="truncate">{p.tranId}</p>
                      <p className="truncate text-[var(--muted-strong)]">{p.valId ?? '—'}</p>
                    </AdminTd>
                    <AdminTd className="max-w-[14rem]">
                      <Link
                        href={`/admin/subscribers/${p.user.id}`}
                        className="truncate font-semibold text-[var(--ink)] hover:underline"
                      >
                        {p.user.name}
                      </Link>
                      <p className="truncate text-xs text-[var(--muted-strong)]">
                        {p.user.whatsappNumber}
                      </p>
                    </AdminTd>
                    <AdminTd className="text-sm">{p.packageName}</AdminTd>
                    <AdminTd className="whitespace-nowrap">{formatBdt(p.amount)}</AdminTd>
                    <AdminTd>
                      <PaymentStatusBadge status={p.status} />
                      {p.failureReason ? (
                        <p
                          className="mt-1 max-w-[12rem] truncate text-xs text-[var(--muted-strong)]"
                          title={p.failureReason}
                        >
                          {p.failureReason}
                        </p>
                      ) : null}
                    </AdminTd>
                    <AdminTd align="right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDialogError(null);
                            setSelected(p);
                          }}
                        >
                          Details
                        </Button>
                        {p.status !== 'REFUNDED' && p.status !== 'SUCCESS' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={recheck.isPending}
                            onClick={() => recheck.mutate(p.id)}
                          >
                            Re-check
                          </Button>
                        ) : null}
                        {p.status === 'RISK' ? (
                          <ConfirmButton
                            size="sm"
                            variant="secondary"
                            confirmTitle="Approve this held payment?"
                            confirmMessage="The payment is validated with SSLCommerz again and, if still valid, the user's subscription is extended."
                            confirmLabel="Approve"
                            destructive={false}
                            onConfirm={() => approve.mutateAsync(p.id)}
                          >
                            Approve
                          </ConfirmButton>
                        ) : null}
                        {p.status === 'SUCCESS' || p.status === 'RISK' ? (
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            confirmTitle="Mark as refunded?"
                            confirmMessage="Bookkeeping only: issue the refund in the SSLCommerz merchant panel. The user's access is not changed automatically."
                            confirmLabel="Mark refunded"
                            onConfirm={() => refund.mutateAsync(p.id)}
                          >
                            Mark refunded
                          </ConfirmButton>
                        ) : null}
                      </div>
                    </AdminTd>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      ) : null}

      <PaymentDetailsDialog
        order={selected}
        pending={recheck.isPending}
        error={dialogError}
        onRecheck={() => selected && recheck.mutate(selected.id)}
        onClose={() => {
          if (!recheck.isPending) setSelected(null);
        }}
      />
    </AdminPage>
  );
}
