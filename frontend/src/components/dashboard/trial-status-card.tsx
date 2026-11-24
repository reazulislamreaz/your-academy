'use client';

import { Hourglass, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { formatDate } from '@/features/billing/format';
import type { AccessSnapshot } from '@/lib/api/types';

/**
 * DEC-061 — trial countdown on the learner dashboard. Days are computed by the API from
 * server time (`access.trialDaysLeft`); nothing here trusts the device clock.
 */
export function TrialStatusCard({ access, isAdmin }: { access: AccessSnapshot; isAdmin: boolean }) {
  if (isAdmin || access.isPaid) return null;

  if (access.isTrialActive && access.trialEndsAt) {
    const days = access.trialDaysLeft;
    return (
      <Surface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-[var(--highlight)]" aria-hidden />
          <div>
            <p className="font-display text-lg font-bold text-[var(--ink)]">
              Free trial: {days} {days === 1 ? 'day' : 'days'} left
            </p>
            <p className="text-sm text-[var(--muted-strong)]">
              Full access until {formatDate(access.trialEndsAt)}.
            </p>
          </div>
        </div>
        {access.paidSystemEnabled ? (
          <Link href="/packages" className="shrink-0">
            <Button size="sm" variant="soft">
              See plans
            </Button>
          </Link>
        ) : null}
      </Surface>
    );
  }

  if (!access.paidSystemEnabled) return null;
  return (
    <Surface className="flex flex-col gap-3 border-l-[3px] border-l-[var(--highlight)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 size-5 shrink-0 text-[var(--ink)]" aria-hidden />
        <div>
          <p className="font-display text-lg font-bold text-[var(--ink)]">
            Your free trial has ended
          </p>
          <p className="text-sm text-[var(--muted-strong)]">
            {access.trialEndsAt ? `Ended ${formatDate(access.trialEndsAt)}. ` : ''}Subscribe to
            unlock every topic, set and paid Model Test.
          </p>
        </div>
      </div>
      <Link href="/packages" className="shrink-0">
        <Button size="sm">Subscribe Now</Button>
      </Link>
    </Surface>
  );
}
