'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Thin top progress for client navigations. Completes quickly to avoid
 * sticky bars after fast transitions; no dependency on NProgress.
 */
function RouteProgressInner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = `${pathname}?${search.toString()}`;
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const first = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setDone(false);
    setActive(true);

    // Soft ramp then complete — feels responsive without blocking paint.
    timers.current.push(
      window.setTimeout(() => setDone(true), 280),
      window.setTimeout(() => {
        setActive(false);
        setDone(false);
      }, 520),
    );

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [key]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          'ya-route-progress h-full origin-left bg-[var(--highlight)] shadow-[0_0_8px_color-mix(in_srgb,var(--highlight)_55%,transparent)]',
          done ? 'ya-route-progress-done' : 'ya-route-progress-run',
        )}
      />
    </div>
  );
}

export function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  );
}
