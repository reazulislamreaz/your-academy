'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { AdminPaymentOrderDto } from '@your-academy/shared';
import { FormDialog } from '@/components/ui/form-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { adminBillingApi } from '@/lib/api/admin-billing';
import { PaymentStatusBadge, formatBdt, formatDateTime } from './billing-format';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 py-1.5 text-sm">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="min-w-0 text-right break-all text-[var(--ink)]">{children}</dd>
    </div>
  );
}

/** Order fields + the redacted SSLCommerz request / response / callback log. */
export function PaymentDetailsDialog({
  order,
  pending,
  error,
  onRecheck,
  onClose,
}: {
  order: AdminPaymentOrderDto | null;
  pending: boolean;
  error: string | null;
  onRecheck: () => void;
  onClose: () => void;
}) {
  const logs = useQuery({
    queryKey: ['admin-payment-logs', order?.id],
    queryFn: () => adminBillingApi.paymentLogs(order!.id),
    enabled: Boolean(order),
  });

  return (
    <FormDialog
      open={Boolean(order)}
      title="Payment details"
      description={order ? <span className="font-mono">{order.tranId}</span> : null}
      confirmLabel="Re-check with SSLCommerz"
      cancelLabel="Close"
      pending={pending}
      error={error}
      disableSubmit={!order || order.status === 'REFUNDED'}
      onSubmit={onRecheck}
      onClose={onClose}
      className="sm:max-w-2xl"
    >
      {order ? (
        <dl className="divide-y divide-[var(--line)]">
          <Row label="Status">
            <PaymentStatusBadge status={order.status} />
          </Row>
          <Row label="User">
            {order.user.name} · {order.user.whatsappNumber}
            {order.user.email ? ` · ${order.user.email}` : ''}
          </Row>
          <Row label="Package">{order.packageName}</Row>
          <Row label="Amount">
            {formatBdt(order.amount)} {order.currency}
          </Row>
          <Row label="val_id">{order.valId ?? '—'}</Row>
          <Row label="Bank tran id">{order.bankTranId ?? '—'}</Row>
          <Row label="Card / method">{order.cardType ?? '—'}</Row>
          <Row label="Gateway status">{order.gatewayStatus ?? '—'}</Row>
          <Row label="Risk">
            {order.riskLevel ?? '—'}
            {order.riskTitle ? ` · ${order.riskTitle}` : ''}
          </Row>
          <Row label="Reason">{order.failureReason ?? '—'}</Row>
          <Row label="Created">{formatDateTime(order.createdAt)}</Row>
          <Row label="Validated">{formatDateTime(order.validatedAt)}</Row>
          <Row label="Subscription applied">{formatDateTime(order.appliedAt)}</Row>
          <Row label="Last re-check">{formatDateTime(order.lastCheckedAt)}</Row>
        </dl>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
          Gateway log (secrets removed)
        </p>
        {logs.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {logs.error ? (
          <p className="text-sm text-[var(--danger-fg)]">Could not load the log.</p>
        ) : null}
        {logs.data?.length === 0 ? (
          <p className="text-sm text-[var(--muted-strong)]">No gateway messages yet.</p>
        ) : null}
        <ol className="space-y-2">
          {(logs.data ?? []).map((entry) => (
            <li key={entry.id} className="rounded-[var(--radius)] border border-[var(--line)] p-2">
              <div className="flex flex-wrap justify-between gap-2 text-xs">
                <span className="font-semibold text-[var(--ink)]">
                  {entry.kind}
                  {entry.httpStatus ? ` · HTTP ${entry.httpStatus}` : ''}
                </span>
                <span className="text-[var(--muted-strong)]">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              <pre className="mt-1 max-h-48 overflow-auto text-[11px] leading-snug whitespace-pre-wrap text-[var(--ink-soft)]">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ol>
      </div>
    </FormDialog>
  );
}
