'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SubscriptionSummary } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { SubscriptionStateBadge, formatDate } from '@/features/admin/billing/billing-format';

/** DEC-060 — read-only summary on the user page; management lives under Subscribers. */
export function UserSubscriptionCard({
  userId,
  subscription,
  role,
}: {
  userId: string;
  subscription: SubscriptionSummary;
  role: string;
}) {
  const isAdmin = role === 'ADMIN';
  return (
    <Surface className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
          Subscription
        </p>
        {isAdmin ? (
          <p className="text-sm text-[var(--ink-soft)]">Admins have full access without a plan.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink)]">
            <SubscriptionStateBadge state={subscription.state} />
            {subscription.endsAt ? (
              <span>
                <span className="font-semibold">{subscription.packageName ?? 'Custom grant'}</span>
                {' · '}
                {subscription.state === 'EXPIRED' ? 'ended' : 'until'}{' '}
                {formatDate(subscription.endsAt)}
              </span>
            ) : (
              <span className="text-[var(--muted-strong)]">Free user</span>
            )}
          </div>
        )}
      </div>
      {!isAdmin ? (
        <Link href={`/admin/subscribers/${userId}`}>
          <Button size="sm" variant="outline">
            Manage subscription
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </Link>
      ) : null}
    </Surface>
  );
}
