type Props = {
  correct: number;
  incorrect: number;
};

/** Simple SVG donut for correct vs incorrect — no chart library. */
export function AccuracyDonut({ correct, incorrect }: Props) {
  const total = correct + incorrect;
  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--muted-strong)]">
        No practice checks yet
      </div>
    );
  }

  const size = 160;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const correctLen = (correct / total) * c;
  const incorrectLen = c - correctLen;
  const accuracy = Math.round((correct / total) * 1000) / 10;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--line)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--viz-positive)"
            strokeWidth={stroke}
            strokeDasharray={`${correctLen} ${incorrectLen}`}
            strokeLinecap="butt"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--viz-negative)"
            strokeWidth={stroke}
            strokeDasharray={`${incorrectLen} ${correctLen}`}
            strokeDashoffset={-correctLen}
            strokeLinecap="butt"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-[var(--ink)]">{accuracy}%</span>
          <span className="text-xs font-medium text-[var(--muted)]">Accuracy</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs font-medium text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[var(--viz-positive)]" />
          Correct {correct}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[var(--viz-negative)]" />
          Incorrect {incorrect}
        </span>
      </div>
    </div>
  );
}
