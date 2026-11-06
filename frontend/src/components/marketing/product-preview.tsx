import { cn } from '@/lib/utils';

/** Static exam-desk MCQ frame for marketing — not interactive. */
export function ProductPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-xl)] border border-white/15 bg-white/95 shadow-[var(--shadow-lg)]',
        className,
      )}
      aria-hidden
    >
      <div className="border-b border-[var(--line)] bg-[var(--bg-desk)] px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-2 w-24 rounded-full bg-[var(--line-strong)]/70" />
          <div className="rounded-[var(--radius-sm)] bg-[var(--highlight-soft)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--highlight-fg)] uppercase">
            Medium
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="h-3 w-48 max-w-full rounded-full bg-[var(--ink)]/80" />
          <div className="h-2.5 w-full rounded-full bg-[var(--line)]" />
          <div className="h-2.5 w-[92%] rounded-full bg-[var(--line)]" />
          <div className="h-2.5 w-[70%] rounded-full bg-[var(--line)]" />
        </div>
        <div className="grid gap-2">
          {[
            { label: 'A', active: false },
            { label: 'B', active: true },
            { label: 'C', active: false },
            { label: 'D', active: false },
          ].map((opt) => (
            <div
              key={opt.label}
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5',
                opt.active
                  ? 'border-[var(--highlight)] bg-[var(--highlight-soft)]'
                  : 'border-[var(--line)] bg-[var(--bg-elevated)]',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[10px] font-bold',
                  opt.active ? 'bg-[var(--highlight)] text-white' : 'bg-[var(--bg-muted)] text-[var(--muted)]',
                )}
              >
                {opt.label}
              </span>
              <span className="h-2 flex-1 rounded-full bg-[var(--line)]" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <div className="h-8 w-20 rounded-[var(--radius)] bg-[var(--bg-muted)]" />
          <div className="h-8 w-28 rounded-[var(--radius)] bg-[var(--highlight)]" />
        </div>
      </div>
    </div>
  );
}
