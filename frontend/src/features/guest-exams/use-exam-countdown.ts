'use client';

import { useEffect, useRef, useState } from 'react';

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/**
 * Live countdown for guest exams. Calls onExpire once when reaching 0.
 */
export function useExamCountdown(opts: {
  durationInMinutes: number;
  running: boolean;
  onExpire: () => void;
}) {
  const total = Math.max(1, opts.durationInMinutes) * 60;
  const [remaining, setRemaining] = useState(total);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(opts.onExpire);
  onExpireRef.current = opts.onExpire;

  useEffect(() => {
    setRemaining(total);
    expiredRef.current = false;
  }, [total, opts.running]);

  useEffect(() => {
    if (!opts.running) return;
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(0, total - elapsed);
      setRemaining(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [opts.running, total]);

  return {
    remainingSeconds: remaining,
    display: formatMmSs(remaining),
    elapsedSeconds: total - remaining,
    isExpired: remaining <= 0,
  };
}
