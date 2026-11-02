import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  href?: string;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export function ListRow({ href, title, meta, description, trailing, className }: Props) {
  const inner = (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1 space-y-1.5">
        {meta ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">{meta}</div>
        ) : null}
        <div className="font-medium text-[var(--ink)]">{title}</div>
        {description ? (
          <div className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{description}</div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0 pt-0.5">{trailing}</div> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="list-row motion-nav-indicator">
        {inner}
      </Link>
    );
  }

  return <div className="list-row">{inner}</div>;
}
