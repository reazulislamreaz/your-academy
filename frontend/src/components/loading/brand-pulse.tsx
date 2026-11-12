import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Compact mark for inline / page; larger for first paint */
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  inverse?: boolean;
};

const SIZES = {
  sm: { box: 'size-10', img: 28, ring: 'size-12' },
  md: { box: 'size-14', img: 40, ring: 'size-[4.25rem]' },
  lg: { box: 'size-20', img: 56, ring: 'size-24' },
} as const;

/**
 * Brand-forward idle indicator — soft pulse + orbit, no generic spinner.
 * Honors `prefers-reduced-motion` via CSS (static mark when reduced).
 */
export function BrandPulse({
  className,
  size = 'md',
  label = 'Loading',
  inverse = false,
}: Props) {
  const s = SIZES[size];
  const src = inverse ? '/images/logo-mark-inverse.png' : '/images/logo-mark.png';

  return (
    <div
      className={cn('ya-brand-pulse relative inline-flex flex-col items-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}…</span>
      <span className={cn('relative inline-flex items-center justify-center', s.ring)}>
        <span
          className={cn(
            'ya-brand-pulse-ring absolute inset-0 rounded-full border border-[var(--highlight)]/25',
            inverse && 'border-white/30',
          )}
          aria-hidden
        />
        <span
          className={cn(
            'ya-brand-pulse-core relative flex items-center justify-center rounded-full bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]',
            inverse && 'bg-white/10 shadow-none',
            s.box,
          )}
        >
          <Image
            src={src}
            alt=""
            width={s.img}
            height={Math.round(s.img * 0.65)}
            className="h-auto w-[70%] object-contain"
            priority
          />
        </span>
      </span>
    </div>
  );
}
