import Link from 'next/link';
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
      className={cn(
        'hp-tile motion-hover-lift ya-panel-shine relative group flex h-full min-h-[7.25rem] touch-manipulation flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-1.5 py-4 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] hover:border-[var(--highlight)]/50 sm:min-h-[8.5rem] sm:gap-2.5 sm:px-2 sm:py-5',
        className,
      )}
    >
      <span className="relative z-[1] flex h-12 w-12 items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.04]">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-12 w-12 object-contain" />
        ) : (
          <HomepageIcon iconKey={iconKey} className="h-12 w-12" />
        )}
      </span>
      <span className="relative z-[1]">
        <span className="block font-display text-sm leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs leading-snug text-[var(--muted-strong)]">
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
      className={cn(
        'motion-hover-lift ya-panel-shine relative group flex h-full min-h-[7.25rem] touch-manipulation flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-[var(--highlight)]/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent),color-mix(in_srgb,var(--highlight-soft)_55%,white)] px-1.5 py-4 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform,background-color] duration-[var(--duration-fast)] hover:border-[var(--highlight)] hover:bg-[var(--highlight-soft)]/80 sm:min-h-[8.5rem] sm:gap-2.5 sm:px-2 sm:py-5',
        className,
      )}
    >
      <span className="relative z-[1] flex h-12 w-12 items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.04]">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-12 w-12 object-contain" />
        ) : iconKey !== 'gear' ? (
          <HomepageIcon iconKey={iconKey} className="h-12 w-12" />
        ) : (
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-lg font-bold text-[var(--highlight)] shadow-[var(--shadow-sm)]"
            aria-hidden
          >
            ···
          </span>
        )}
      </span>
      <span className="relative z-[1] font-display text-sm font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
        {title}
      </span>
    </Link>
  );
}
