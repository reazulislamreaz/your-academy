import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  href?: string;
  /** Light logo for navy / dark panels */
  inverse?: boolean;
  /** Compact YA mark only (tight headers) */
  markOnly?: boolean;
  /** Only set on above-the-fold marketing / auth heroes */
  priority?: boolean;
};

const FULL = {
  src: '/images/logo.png',
  inverseSrc: '/images/logo-inverse.png',
  width: 354,
  height: 284,
  className: 'h-12 w-auto sm:h-14',
} as const;

const MARK = {
  src: '/images/logo-mark.png',
  inverseSrc: '/images/logo-mark-inverse.png',
  width: 345,
  height: 225,
  className: 'h-9 w-auto sm:h-10',
} as const;

/** Official YA lockup — one logo across marketing, app, admin, and auth. */
export function BrandMark({ className, href = '/', inverse, markOnly, priority = false }: Props) {
  const asset = markOnly ? MARK : FULL;
  const src = inverse ? asset.inverseSrc : asset.src;

  return (
    <Link
      href={href}
      className={cn('group inline-flex shrink-0 items-center', className)}
      aria-label="Your Academy home"
    >
      <Image
        src={src}
        alt="Your Academy"
        width={asset.width}
        height={asset.height}
        sizes="(max-width: 1024px) 120px, 160px"
        className={cn(asset.className, 'object-contain object-left')}
        priority={priority}
      />
    </Link>
  );
}
