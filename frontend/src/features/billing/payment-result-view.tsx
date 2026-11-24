'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ShieldAlert, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PaymentOrderPublicStatus } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { meQueryKey } from '@/features/auth/use-auth';
import { getPaymentStatus } from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import { formatBdt, formatDate } from './format';

/** How long the page keeps asking while the gateway confirmation is on its way. */
const POLL_MS = 3_000;
const POLL_FOR_MS = 2 * 60_000;

/**
 * DEC-060 — result page after SSLCommerz. The status always comes from our API (by the
 * unguessable tran_id), never from the URL, so it also works when the learner was logged out.
 */
export function PaymentResultView({ page }: { page: 'success' | 'failed' | 'cancelled' }) {
  const tranId = useSearchParams().get('tran_id') ?? '';
  const qc = useQueryClient();
  const [startedAt] = useState(() => Date.now());

  const status = useQuery({
    queryKey: ['payment-status', tranId],
    queryFn: () => getPaymentStatus(tranId),
    enabled: Boolean(tranId),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 3,
    refetchInterval: (q) =>
      q.state.data?.status === 'PENDING' && Date.now() - startedAt < POLL_FOR_MS ? POLL_MS : false,
  });

  // Plan changed → refresh the cached user so locks disappear right away.
  const refreshed = useRef(false);
  useEffect(() => {
    if (status.data?.status === 'SUCCESS' && !refreshed.current) {
      refreshed.current = true;
      void qc.invalidateQueries({ queryKey: meQueryKey });
    }
  }, [qc, status.data?.status]);

  if (!tranId || (status.isError && status.error instanceof ApiError && status.error.status === 404)) {
    return (
      <ResultCard
        tone="danger"
        title={page === 'cancelled' ? 'Payment cancelled' : 'Payment not completed'}
        body="We could not find this payment. No money was taken for an unfinished checkout — you can try again."
      />
    );
  }
  if (status.isLoading) {
    return <ResultCard tone="pending" title="Checking your payment…" body="One moment." />;
  }
  if (status.isError || !status.data) {
    return (
      <ResultCard
        tone="pending"
        title="We could not check your payment right now"
        body="If you paid, your plan is activated automatically as soon as SSLCommerz confirms it. Check your profile in a few minutes."
        tranId={tranId}
        retry={() => void status.refetch()}
      />
    );
  }
  return <StatusCard order={status.data} stillPolling={Date.now() - startedAt < POLL_FOR_MS} />;
}

function StatusCard({
  order,
  stillPolling,
}: {
  order: PaymentOrderPublicStatus;
  stillPolling: boolean;
}) {
  const what = `${order.packageName} · ${formatBdt(order.amount)}`;
  switch (order.status) {
    case 'SUCCESS':
      return (
        <ResultCard
          tone="success"
          title="Payment successful"
          body={
            order.subscriptionEndsAt
              ? `Your plan is active until ${formatDate(order.subscriptionEndsAt)}. Every set and paid Model Test is now unlocked.`
              : 'Your plan is active. Every set and paid Model Test is now unlocked.'
          }
          detail={what}
          tranId={order.tranId}
        />
      );
    case 'PENDING':
      return (
        <ResultCard
          tone="pending"
          title={stillPolling ? 'Confirming your payment…' : 'Payment is still being confirmed'}
          body={
            stillPolling
              ? 'Waiting for SSLCommerz to confirm. This page updates by itself.'
              : 'If money was taken, your plan is activated automatically once SSLCommerz confirms it — you can close this page. Contact support with the transaction ID if it is not active within an hour.'
          }
          detail={what}
          tranId={order.tranId}
        />
      );
    case 'RISK':
      return (
        <ResultCard
          tone="risk"
          title="Payment under review"
          body="The payment gateway flagged this payment for a manual check. Our team will review it and activate your plan — no need to pay again."
          detail={what}
          tranId={order.tranId}
        />
      );
    case 'CANCELLED':
      return (
        <ResultCard
          tone="danger"
          title="Payment cancelled"
          body="You cancelled the payment. Nothing was charged and your plan did not change."
          detail={what}
          tranId={order.tranId}
        />
      );
    case 'REFUNDED':
      return (
        <ResultCard
          tone="danger"
          title="Payment refunded"
          body="This payment was refunded."
          detail={what}
          tranId={order.tranId}
        />
      );
    default:
      return (
        <ResultCard
          tone="danger"
          title="Payment failed"
          body="The payment did not go through, so no access was given. You can try again."
          detail={what}
          tranId={order.tranId}
        />
      );
  }
}

const TONE = {
  success: { Icon: CheckCircle2, color: 'text-[var(--success)]' },
  pending: { Icon: Clock3, color: 'text-[var(--warning)]' },
  danger: { Icon: XCircle, color: 'text-[var(--danger)]' },
  risk: { Icon: ShieldAlert, color: 'text-[var(--warning)]' },
} as const;

function ResultCard({
  tone,
  title,
  body,
  detail,
  tranId,
  retry,
}: {
  tone: keyof typeof TONE;
  title: string;
  body: ReactNode;
  detail?: string;
  tranId?: string;
  retry?: () => void;
}) {
  const { Icon, color } = TONE[tone];
  return (
    <Surface role="status" aria-live="polite" className="mx-auto max-w-lg space-y-4 p-6 text-center sm:p-8">
      <Icon className={`mx-auto size-12 ${color}`} aria-hidden />
      <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)]">{title}</h1>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{body}</p>
      {detail ? <p className="text-sm font-semibold text-[var(--ink)]">{detail}</p> : null}
      {tranId ? (
        <p className="text-xs break-all text-[var(--muted)]">
          Transaction ID: <span className="font-mono">{tranId}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {retry ? (
          <Button variant="outline" onClick={retry}>
            Check again
          </Button>
        ) : null}
        {tone === 'success' ? (
          <Link href="/preli-question-bank">
            <Button>Start studying</Button>
          </Link>
        ) : tone === 'danger' ? (
          <Link href="/packages">
            <Button>Try again</Button>
          </Link>
        ) : null}
        <Link href="/profile">
          <Button variant="ghost">My plan</Button>
        </Link>
      </div>
    </Surface>
  );
}
