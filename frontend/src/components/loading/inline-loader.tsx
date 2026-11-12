import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Accessible label (visually hidden) */
  label?: string;
};

/** Tiny orbit for buttons and compact actions — GPU-friendly CSS only. */
export function InlineLoader({ className, label = 'Loading' }: Props) {
  return (
    <span
      className={cn('ya-inline-loader inline-flex shrink-0', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}…</span>
      <span className="ya-inline-loader-dot" aria-hidden />
    </span>
  );
}
