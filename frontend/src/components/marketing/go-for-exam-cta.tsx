import Link from 'next/link';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Compact inline strip for nested headers */
  compact?: boolean;
};

/**
 * Preli / Written bank → dashboard Preli Practice CTA.
 * Guests are sent by middleware to `/login?next=/preli-practice` and land there after sign-in.
 */
export function GoForExamCta({ className, compact }: Props) {
  return (
    <aside
      className={cn(
        'ya-exam-cta relative overflow-hidden rounded-[1.25rem] border border-[var(--highlight)]/20',
        'bg-[linear-gradient(135deg,color-mix(in_srgb,var(--highlight-soft)_88%,white),var(--bg-elevated)_55%,color-mix(in_srgb,var(--accent-soft)_70%,white))]',
        'shadow-[var(--shadow-sm)]',
        compact ? 'px-4 py-3.5 sm:px-5' : 'px-4 py-4 sm:px-6 sm:py-5',
        className,
      )}
      aria-label="Start exam practice"
    >
      <div
        aria-hidden
        className="ya-exam-cta-glow pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[var(--highlight)]/15 blur-2xl"
      />
      <div
        aria-hidden
        className="ya-exam-cta-glow pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[var(--accent)]/12 blur-2xl"
      />

      <div
        className={cn(
          'relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          compact ? 'sm:gap-4' : 'sm:gap-6',
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'ya-exam-cta-icon flex shrink-0 items-center justify-center rounded-full bg-[var(--highlight)]/12 text-[var(--highlight)]',
              compact ? 'size-10' : 'size-11 sm:size-12',
            )}
            aria-hidden
          >
            <ClipboardList className={compact ? 'size-5' : 'size-5 sm:size-6'} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="font-display text-base font-bold tracking-tight text-[var(--ink)] sm:text-lg">
              Ready to test yourself?
            </p>
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
              Move from browsing sets to timed exam practice in your dashboard.
            </p>
          </div>
        </div>

        <Link
          href="/preli-practice"
          className={cn(
            'ya-exam-cta-btn motion-press group inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2',
            'rounded-full bg-[var(--highlight)] px-6 text-sm font-semibold text-[var(--highlight-fg)]',
            'shadow-[var(--shadow-sm)] transition-[transform,box-shadow,filter] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            'hover:brightness-[1.06] hover:shadow-[var(--shadow)] active:brightness-95',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--highlight)]',
            'sm:w-auto',
          )}
        >
          Go for Exam
          <ArrowRight
            className="size-4 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </aside>
  );
}
