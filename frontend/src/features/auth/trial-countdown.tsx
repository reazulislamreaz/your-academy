'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function TrialCountdown({
  trialEndsAt,
  isTrialActive,
  className,
}: {
  trialEndsAt: string;
  isTrialActive: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const ends = new Date(trialEndsAt).getTime();
  const remaining = ends - now;
  const active = isTrialActive && remaining > 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Badge variant={active ? 'success' : 'outline'}>
        {active ? 'Trial active' : 'Trial ended'}
      </Badge>
      <span className="text-sm text-[var(--muted)]">
        {active ? formatRemaining(remaining) : `Ended ${new Date(trialEndsAt).toLocaleString()}`}
      </span>
    </div>
  );
}
