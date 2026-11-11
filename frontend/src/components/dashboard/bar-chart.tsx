import { cn } from '@/lib/utils';

export type BarDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: BarDatum[];
  className?: string;
  /** Format tooltip / value labels */
  formatValue?: (value: number) => string;
  emptyLabel?: string;
};

/** Simple horizontal comparison bars — no chart library. */
export function BarChart({
  data,
  className,
  formatValue = (v) => String(v),
  emptyLabel = 'No data yet',
}: Props) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) {
    return (
      <p className={cn('py-8 text-center text-sm text-[var(--muted)]', className)}>{emptyLabel}</p>
    );
  }

  return (
    <ul className={cn('space-y-3', className)}>
      {data.map((item) => {
        const pct = Math.max(4, Math.round((item.value / max) * 100));
        return (
          <li key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-[var(--ink-soft)]">{item.label}</span>
              <span className="tabular-nums text-[var(--muted)]">{formatValue(item.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--bg-muted)]">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out)]"
                style={{
                  width: `${pct}%`,
                  background: item.color ?? 'var(--info)',
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
