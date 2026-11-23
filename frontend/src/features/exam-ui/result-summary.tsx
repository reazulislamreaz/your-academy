import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { formatElapsed } from './format';

type Stat = { label: string; value: ReactNode; tone?: 'success' | 'danger' | 'warning' | 'muted' };

type Props = {
  eyebrow: string;
  title: string;
  /** Extra line under the title (candidate, submitted time…). */
  meta?: ReactNode;
  percent: number;
  /** e.g. "18" with `scoreOutOf` "25". */
  score: ReactNode;
  scoreOutOf?: ReactNode;
  scoreCaption?: string;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  timeTakenSeconds?: number | null;
  timeLimitSeconds?: number | null;
  /** Badges such as Passed / Timed out. */
  badges?: ReactNode;
  /** Additional tiles (negative marking, accuracy…). */
  extraStats?: Stat[];
  actions?: ReactNode;
};

const TONE_TEXT: Record<NonNullable<Stat['tone']>, string> = {
  success: 'text-[var(--success-fg)]',
  danger: 'text-[var(--danger-fg)]',
  warning: 'text-[var(--warning-fg)]',
  muted: 'text-[var(--muted-strong)]',
};

/** Score ring + breakdown bar + stat tiles. Pure CSS/SVG — no chart library. */
export function ResultSummary({
  eyebrow,
  title,
  meta,
  percent,
  score,
  scoreOutOf,
  scoreCaption = 'Score',
  correct,
  wrong,
  skipped,
  total,
  timeTakenSeconds,
  timeLimitSeconds,
  badges,
  extraStats = [],
  actions,
}: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(percent)));
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const ringColor = pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--highlight)';
  const taken = formatElapsed(timeTakenSeconds);
  const limit = formatElapsed(timeLimitSeconds);
  const share = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const stats: Stat[] = [
    { label: 'Correct', value: correct, tone: 'success' },
    { label: 'Wrong', value: wrong, tone: 'danger' },
    { label: 'Skipped', value: skipped, tone: 'warning' },
    ...(taken
      ? [
          {
            label: limit ? `Time taken (of ${limit})` : 'Time taken',
            value: taken,
          },
        ]
      : []),
    ...extraStats,
  ];

  return (
    <section
      aria-labelledby="result-title"
      className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]"
    >
      <div className="bg-[linear-gradient(160deg,var(--brand-wash-strong),transparent_75%)] p-5 sm:p-7">
        <p className="text-[0.7rem] font-semibold tracking-[0.14em] text-[var(--highlight)] uppercase">
          {eyebrow}
        </p>
        <h1
          id="result-title"
          className="mt-1 font-display text-xl leading-snug font-bold break-words text-[var(--ink)] sm:text-2xl"
        >
          {title}
        </h1>
        {meta ? <div className="mt-1 text-sm text-[var(--muted-strong)]">{meta}</div> : null}
        {badges ? <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div> : null}

        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <div className="relative size-32 shrink-0 sm:size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
              <circle cx="60" cy="60" r={r} fill="none" stroke="var(--bg-muted)" strokeWidth="12" />
              {pct > 0 ? (
                <circle
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
                />
              ) : null}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold tabular-nums text-[var(--ink)]">
                {pct}%
              </span>
              <span className="text-[0.7rem] text-[var(--muted-strong)]">percentage</span>
            </div>
          </div>

          <div className="w-full min-w-0 flex-1 space-y-3">
            <p className="text-center sm:text-left">
              <span className="block text-xs font-medium text-[var(--muted-strong)]">
                {scoreCaption}
              </span>
              <span className="font-display text-4xl font-bold tabular-nums text-[var(--ink)]">
                {score}
              </span>
              {scoreOutOf != null ? (
                <span className="font-display text-xl font-semibold tabular-nums text-[var(--muted)]">
                  {' '}
                  / {scoreOutOf}
                </span>
              ) : null}
            </p>

            <div>
              <div
                className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--bg-muted)]"
                role="img"
                aria-label={`${correct} correct, ${wrong} wrong, ${skipped} skipped out of ${total}`}
              >
                <span
                  className="h-full bg-[var(--success)]"
                  style={{ width: `${share(correct)}%` }}
                />
                <span className="h-full bg-[var(--danger)]" style={{ width: `${share(wrong)}%` }} />
                <span
                  className="h-full bg-[var(--warning)]"
                  style={{ width: `${share(skipped)}%` }}
                />
              </div>
              <ul
                className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-[var(--muted-strong)] sm:justify-start"
                aria-hidden
              >
                <li className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[var(--success)]" /> Correct
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[var(--danger)]" /> Wrong
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[var(--warning)]" /> Skipped
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 border-t border-[var(--line)] p-4 sm:grid-cols-4 sm:px-7">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-soft)] px-3.5 py-2.5"
          >
            <dt className="text-xs text-[var(--muted-strong)]">{stat.label}</dt>
            <dd
              className={cn(
                'mt-0.5 font-display text-xl font-bold tabular-nums text-[var(--ink)]',
                stat.tone && TONE_TEXT[stat.tone],
              )}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {actions ? (
        <div className="flex flex-col gap-2 border-t border-[var(--line)] p-4 sm:flex-row sm:flex-wrap sm:px-7">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
