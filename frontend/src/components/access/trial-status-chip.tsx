'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

function formatShort(ms: number): string {
  if (ms <= 0) return 'Ended';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor((totalSec % 3600) / 60);
  return `${mins}m left`;
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
        'motion-nav-indicator hidden items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-semibold tracking-wide md:inline-flex',
        active
          ? 'bg-[var(--success-soft)] text-[var(--success)] hover:brightness-95'
          : 'bg-[var(--highlight-soft)] text-[var(--highlight)] hover:brightness-95',
        className,
      )}
      title={active ? 'Trial includes answers and explanations' : 'Browse stays open; answers are premium'}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-[var(--success)]' : 'bg-[var(--highlight)]')}
        aria-hidden
      />
      {active ? `Trial · ${formatShort(remaining)}` : 'Trial ended'}
    </Link>
  );
}
