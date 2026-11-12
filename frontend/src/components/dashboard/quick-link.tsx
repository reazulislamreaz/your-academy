import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
};

export function QuickLink({ href, title, description, icon: Icon, className }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        'motion-hover-lift group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,background-color] hover:border-[var(--highlight)]/35 hover:shadow-[var(--shadow)] sm:p-4',
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--info-soft)] text-[var(--info)]">
        <Icon className="size-4" aria-hidden strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">
            {title}
          </span>
          <ArrowRight
            className="size-4 shrink-0 text-[var(--muted)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[var(--highlight)]"
            aria-hidden
          />
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--muted-strong)] sm:text-sm">
          {description}
        </span>
      </span>
    </Link>
  );
}
