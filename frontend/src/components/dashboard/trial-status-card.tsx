'use client';

import { Hourglass, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { formatDate } from '@/features/billing/format';
import type { AccessSnapshot } from '@/lib/api/types';

/**
 * DEC-061 / DEC-063 — Topic-Based trial countdown on the learner dashboard. The trial unlocks
 * Topic-Based questions only; every other section follows the free plan. Days are computed by the API from
 * server time (`access.trialDaysLeft`); nothing here trusts the device clock.
 */
export function TrialStatusCard({ access, isAdmin }: { access: AccessSnapshot; isAdmin: boolean }) {
  // Paid system OFF = everything is open; a trial message would only confuse.
  if (isAdmin || access.isPaid || !access.paidSystemEnabled) return null;

  if (access.isTrialActive && access.trialEndsAt) {
    const days = access.trialDaysLeft;
    return (
      <Surface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-[var(--highlight)]" aria-hidden />
          <div>
            <p className="font-display text-lg font-bold text-[var(--ink)]">
              Topic-Based free access: {days} {days === 1 ? 'day' : 'days'} left
            </p>
            <p className="text-sm text-[var(--muted-strong)]">
              Topic-Based questions are open until {formatDate(access.trialEndsAt)}. Other sections
              follow the free plan.
            </p>
          </div>
        </div>
        <Link href="/packages" className="shrink-0">
          <Button size="sm" variant="soft">
            See plans
          </Button>
        </Link>
      </Surface>
    );
  }

  return (
    <Surface className="flex flex-col gap-3 border-l-[3px] border-l-[var(--highlight)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 size-5 shrink-0 text-[var(--ink)]" aria-hidden />
        <div>
          <p className="font-display text-lg font-bold text-[var(--ink)]">
            Your Topic-Based free access has ended
          </p>
          <p className="text-sm text-[var(--muted-strong)]">
            {access.trialEndsAt ? `Ended ${formatDate(access.trialEndsAt)}. ` : ''}Subscribe to
            unlock Topic-Based questions, every set and paid Model Test.
          </p>
        </div>
      </div>
      <Link href="/packages" className="shrink-0">
        <Button size="sm">Subscribe Now</Button>
      </Link>
    </Surface>
  );
}
