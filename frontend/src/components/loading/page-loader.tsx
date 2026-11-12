import { cn } from '@/lib/utils';
import { BrandPulse } from './brand-pulse';

type Props = {
  className?: string;
  label?: string;
  /** Shorter vertical space inside an already-mounted shell */
  compact?: boolean;
  /** Optional caption under the mark */
  caption?: string;
};

/**
 * In-layout page / Suspense loader. Keeps chrome (header/sidebar) visible —
 * never a full-viewport takeover for ordinary navigations.
 */
export function PageLoader({
  className,
  label = 'Loading page',
  compact = false,
  caption,
}: Props) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center',
        compact ? 'min-h-[12rem] py-10' : 'min-h-[40vh] py-16 sm:min-h-[50vh]',
        className,
      )}
    >
      <BrandPulse size={compact ? 'sm' : 'md'} label={label} />
      {caption ? (
        <p className="mt-4 max-w-xs text-center text-sm text-[var(--muted-strong)]">{caption}</p>
      ) : null}
    </div>
  );
}
