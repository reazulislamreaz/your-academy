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

/** Red open-book mark + YOUR ACADEMY wordmark (matches homepage design). */
export function BrandMark({ className, href = '/', inverse, markOnly }: Props) {
  return (
    <Link
      href={href}
      className={cn('group inline-flex items-center gap-2.5 font-display tracking-tight', className)}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center',
          inverse ? 'text-white' : 'text-[var(--highlight)]',
        )}
      >
        <svg viewBox="0 0 36 32" className="h-8 w-8" fill="none">
          <path
            d="M3 6.5C7.2 4.2 11.2 3.8 15 5.2V24.5C10.8 22.7 6.6 22.9 3 25V6.5Z"
            fill="currentColor"
          />
          <path
            d="M33 6.5C28.8 4.2 24.8 3.8 21 5.2V24.5C25.2 22.7 29.4 22.9 33 25V6.5Z"
            fill="currentColor"
          />
          <path
            d="M15 5.2C16.2 5.7 17.8 5.7 21 5.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M17.2 5.5V24.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      {markOnly ? (
        <span className="sr-only">Your Academy</span>
      ) : (
        <span
          className={cn(
            'flex flex-col text-[0.95rem] leading-[0.92] font-extrabold tracking-tight uppercase sm:text-[1.05rem]',
            inverse ? 'text-white' : 'text-[var(--highlight)]',
          )}
        >
          <span>Your</span>
          <span>Academy</span>
        </span>
      )}
    </Link>
  );
}
