'use client';

import Link from 'next/link';
import { Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

function formatDaysLeft(ms: number): string {
  if (ms <= 0) return 'Ended';
  const days = Math.max(1, Math.ceil(ms / 86_400_000));
  return days === 1 ? '1 day left' : `${days} days left`;
}

export function TrialStatusChip({ className }: { className?: string }) {
  const me = useMe();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const access = me.data?.access;
  if (!access || me.data?.role === 'ADMIN') return null;

  const remaining = new Date(access.trialEndsAt).getTime() - now;
  const active = access.isTrialActive && remaining > 0;

  return (
    <Link
      href="/home"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold tracking-wide transition-colors',
        active
          ? 'border-[var(--highlight)]/25 bg-[var(--highlight-soft)] text-[var(--highlight)] hover:bg-[var(--highlight-hover)]'
          : 'border-[var(--line)] bg-[var(--bg-muted)] text-[var(--muted-strong)] hover:border-[var(--line-strong)]',
        className,
      )}
      title={
        active
          ? 'Trial includes answers and explanations'
          : 'Browse stays open; answers are premium'
      }
    >
      <Hourglass className="size-3.5 shrink-0" aria-hidden strokeWidth={2} />
      {active ? formatDaysLeft(remaining) : 'Trial ended'}
    </Link>
  );
}
