'use client';

import { useEffect, useRef, useState } from 'react';

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/**
 * Wall-clock countdown from a fixed start timestamp.
 * Survives remounts when `startedAtMs` is restored from sessionStorage.
 * Calls `onExpire` once when remaining hits 0.
 */
export function useExamCountdown(opts: {
  durationInMinutes: number;
  /** Epoch ms when the attempt started; null = not running. */
  startedAtMs: number | null;
  onExpire: () => void;
}) {
  const total = Math.max(1, Math.floor(opts.durationInMinutes)) * 60;
  const [remaining, setRemaining] = useState(() => {
    if (!opts.startedAtMs) return total;
    const elapsed = Math.floor((Date.now() - opts.startedAtMs) / 1000);
    return Math.max(0, total - elapsed);
  });
  const expiredRef = useRef(false);
  const onExpireRef = useRef(opts.onExpire);
  onExpireRef.current = opts.onExpire;

  useEffect(() => {
    expiredRef.current = false;
    if (!opts.startedAtMs) {
      setRemaining(total);
      return;
    }
    const elapsed = Math.floor((Date.now() - opts.startedAtMs) / 1000);
    setRemaining(Math.max(0, total - elapsed));
  }, [opts.startedAtMs, total]);

  useEffect(() => {
    if (!opts.startedAtMs) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - opts.startedAtMs!) / 1000);
      const next = Math.max(0, total - elapsed);
      setRemaining(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [opts.startedAtMs, total]);

  const elapsedSeconds = opts.startedAtMs
    ? Math.min(total, Math.max(0, total - remaining))
    : 0;

  return {
    remainingSeconds: remaining,
    display: formatMmSs(remaining),
    elapsedSeconds,
    isExpired: remaining <= 0 && Boolean(opts.startedAtMs),
  };
}
