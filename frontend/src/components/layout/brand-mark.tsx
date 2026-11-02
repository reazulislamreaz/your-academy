import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  href?: string;
  /** Inverse (on navy panels) */
  inverse?: boolean;
  /** Hide wordmark on very tight headers */
  markOnly?: boolean;
};

export function BrandMark({ className, href = '/', inverse, markOnly }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 font-display tracking-tight',
        inverse ? 'text-white' : 'text-[var(--ink)]',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]',
          inverse
            ? 'bg-[var(--highlight)] text-[var(--highlight-fg)]'
            : 'bg-[var(--bg-inverse)] text-[var(--highlight)]',
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-95">
          <path
            d="M3 3.5h7.5a2.5 2.5 0 0 1 0 5H5.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M5.5 8.5H11a2.5 2.5 0 0 1 0 5H3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="3" cy="3.5" r="1.15" fill="currentColor" />
          <circle cx="3" cy="13.5" r="1.15" fill="currentColor" />
        </svg>
      </span>
      {markOnly ? (
        <span className="sr-only">Your Academy</span>
      ) : (
        <span className="text-xl font-extrabold sm:text-2xl">Your Academy</span>
      )}
    </Link>
  );
}
