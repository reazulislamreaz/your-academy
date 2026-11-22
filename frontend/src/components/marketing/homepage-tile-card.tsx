import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { HomepageIconKey } from '@your-academy/shared';
import { HomepageIcon } from '@/lib/homepage-icon-map';
import { cn } from '@/lib/utils';

export type HomepageTileCardProps = {
  href: string;
  title: string;
  subtitle?: string;
  iconKey: HomepageIconKey;
  logoUrl?: string | null;
  className?: string;
  tone?: 'preli' | 'written' | 'topic';
};

export function HomepageTileCard({
  href,
  title,
  subtitle,
  iconKey,
  logoUrl,
  className,
}: HomepageTileCardProps) {
  return (
    <Link
      href={href}
      data-hp-stagger
      className={cn(
        'hp-tile motion-hover-lift relative group flex h-full min-h-[6.75rem] touch-manipulation flex-col items-start justify-between gap-3 overflow-hidden px-3.5 py-3.5 text-left transition-[border-color,box-shadow,transform] duration-200 sm:min-h-[7.5rem] sm:px-4 sm:py-4',
        className,
      )}
    >
      <span className="relative z-[1] flex w-full items-start justify-between gap-2">
        <span className="hp-icon-chip flex h-10 w-10">
          {logoUrl ? (
            // CMS Cloudinary URLs; sized explicitly for CLS (plain <img> — no next/image remote allowlist needed)
            <img src={logoUrl} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
          ) : (
            <HomepageIcon iconKey={iconKey} className="h-5 w-5" />
          )}
        </span>
        <ArrowUpRight
          className="h-3.5 w-3.5 text-[var(--muted)] opacity-0 transition-[opacity,transform,color] duration-200 group-hover:translate-x-0 group-hover:text-[var(--highlight)] group-hover:opacity-100"
          aria-hidden
        />
      </span>
      <span className="relative z-[1] min-w-0">
        <span className="block truncate font-display text-sm leading-snug font-semibold tracking-tight text-[var(--ink)] sm:text-[0.9375rem]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-[var(--muted-strong)]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function HomepageOthersTile({
  href,
  title = 'Others',
  logoUrl,
  iconKey = 'gear',
  className,
}: {
  href: string;
  title?: string;
  logoUrl?: string | null;
  iconKey?: HomepageIconKey;
  className?: string;
}) {
  return (
    <Link
      href={href}
      data-hp-stagger
      className={cn(
        'motion-hover-lift relative group flex h-full min-h-[6.75rem] touch-manipulation flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl border border-dashed border-[var(--hp-panel-border)] bg-[color-mix(in_srgb,var(--bg-muted)_50%,var(--bg-elevated))] px-3.5 py-3.5 text-left transition-[border-color,background-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--highlight)_35%,var(--line))] hover:bg-[var(--highlight-soft)] sm:min-h-[7.5rem] sm:px-4 sm:py-4',
        className,
      )}
    >
      <span className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--hp-panel-border)] bg-[var(--bg-elevated)] text-[var(--ink-soft)]">
        {logoUrl ? (
          <img src={logoUrl} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
        ) : iconKey !== 'gear' ? (
          <HomepageIcon iconKey={iconKey} className="h-5 w-5" />
        ) : (
          <span className="text-sm font-semibold tracking-widest text-[var(--muted)]" aria-hidden>
            ···
          </span>
        )}
      </span>
      <span className="relative z-[1] flex w-full items-center justify-between gap-2">
        <span className="font-display text-sm font-semibold tracking-tight text-[var(--ink)] sm:text-[0.9375rem]">
          {title}
        </span>
        <ArrowUpRight
          className="h-3.5 w-3.5 text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--highlight)]"
          aria-hidden
        />
      </span>
    </Link>
  );
}
