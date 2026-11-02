import Link from 'next/link';
import { cn } from '@/lib/utils';

export function BrandMark({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'font-display text-xl font-extrabold tracking-tight text-[var(--ink)] sm:text-2xl',
        className,
      )}
    >
      Your Academy
    </Link>
  );
}
