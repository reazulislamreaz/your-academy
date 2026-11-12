import { cn } from '@/lib/utils';
import { BrandPulse } from './brand-pulse';

type Props = {
  className?: string;
  label?: string;
};

/**
 * First-paint / hard refresh only. Soft desk wash + brand pulse.
 * Do not use for per-query or per-widget loading.
 */
export function GlobalLoader({ className, label = 'Loading Your Academy' }: Props) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center',
        'bg-[var(--bg)]',
        'ya-global-loader-bg',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BrandPulse size="lg" label={label} />
      <p className="mt-5 font-display text-sm font-semibold tracking-wide text-[var(--ink)]">
        Your Academy
      </p>
    </div>
  );
}
