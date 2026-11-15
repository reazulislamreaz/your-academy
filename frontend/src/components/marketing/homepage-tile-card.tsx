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
        'motion-hover-lift ya-panel-shine relative group flex h-full min-h-[8.5rem] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] hover:border-[var(--highlight)]/50',
        className,
      )}
    >
      <span className="relative z-[1] flex h-12 w-12 items-center justify-center">
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

export function HomepageOthersTile({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'motion-hover-lift ya-panel-shine relative group flex h-full min-h-[8.5rem] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-[var(--highlight)]/45 bg-[var(--highlight-soft)]/40 px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform,background-color] duration-[var(--duration-fast)] hover:border-[var(--highlight)] hover:bg-[var(--highlight-soft)]/70',
        className,
      )}
    >
      <span
        className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-lg font-bold text-[var(--highlight)] shadow-[var(--shadow-sm)]"
        aria-hidden
      >
        ···
      </span>
      <span className="relative z-[1] font-display text-sm font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
        Others
      </span>
    </Link>
  );
}
