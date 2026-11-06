import Image from 'next/image';
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

/**
 * The site's own shield mark (graduation cap + open book) with the
 * stacked "YOUR / ACADEMY" wordmark. On navy panels the wordmark turns
 * white; the red shield works on both light and navy.
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
      <Image
        src="/images/logo-mark.png"
        alt=""
        width={256}
        height={182}
        className="h-8 w-auto shrink-0"
        priority
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
