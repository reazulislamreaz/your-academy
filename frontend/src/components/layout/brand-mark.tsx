import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  href?: string;
  /** Inverse (on navy panels) */
  inverse?: boolean;
  /** Hide wordmark on very tight headers */
  markOnly?: boolean;
};

/**
 * Red open-book mark + stacked "YOUR / ACADEMY" wordmark.
 * On navy panels the mark and wordmark turn white.
 */
export function BrandMark({ className, href = '/', inverse, markOnly }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2 font-display tracking-tight',
        inverse ? 'text-white' : 'text-[var(--highlight)]',
        className,
      )}
    >
      <BookOpen
        aria-hidden
        className="h-8 w-8 shrink-0"
        strokeWidth={2.25}
      />
      {markOnly ? (
        <span className="sr-only">Your Academy</span>
      ) : (
        <span className="flex flex-col text-[1.05rem] leading-[0.95] font-extrabold tracking-tight">
          <span>YOUR</span>
          <span>ACADEMY</span>
        </span>
      )}
    </Link>
  );
}
