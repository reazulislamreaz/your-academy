/** `mm:ss` (or `h:mm:ss` past an hour) for countdowns. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Human duration for summaries, e.g. `12m 05s`, `45s`. */
export function formatElapsed(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${String(r).padStart(2, '0')}s`;
}

export type TimerTone = 'normal' | 'warning' | 'danger';

/**
 * Low-time styling: warning under 10% of the allowance or 2 minutes,
 * danger in the final minute.
 */
export function timerTone(remainingSeconds: number, totalSeconds: number | null): TimerTone {
  if (remainingSeconds <= 60) return 'danger';
  const tenPercent = totalSeconds != null && totalSeconds > 0 ? totalSeconds * 0.1 : 0;
  if (remainingSeconds <= 120 || remainingSeconds <= tenPercent) return 'warning';
  return 'normal';
}
