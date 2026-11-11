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
        'group flex items-start gap-3 rounded-[14px] border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--highlight-soft)] text-[var(--highlight)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold tracking-tight text-[var(--ink)]">
            {title}
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--highlight)]"
            aria-hidden
          />
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{description}</span>
      </span>
    </Link>
  );
}
