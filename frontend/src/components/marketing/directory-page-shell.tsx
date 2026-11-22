import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  heading: string;
  subtitle?: string;
  /** Current page label in the breadcrumb trail (defaults to heading). */
  breadcrumbLabel?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};

/** Shared chrome for All Categories / All Topics — matches homepage marketing rail. */
export function DirectoryPageShell({
  heading,
  subtitle,
  breadcrumbLabel,
  backHref = '/',
  backLabel = 'Back to home',
  children,
}: Props) {
  const crumb = breadcrumbLabel ?? heading;

  return (
    <div className="homepage-shell flex min-h-0 w-full flex-1 flex-col">
      <div className="marketing-container w-full min-w-0 flex-1 space-y-7 py-8 sm:space-y-8 sm:py-14">
        <Reveal className="space-y-4">
          <nav aria-label="Breadcrumb" className="space-y-2.5">
            <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--muted-strong)]">
              <li>
                <Link
                  href={backHref}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-1.5 font-medium transition-colors hover:text-[var(--highlight)]"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden className="flex items-center">
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              </li>
              <li className="min-w-0">
                <span
                  className="line-clamp-2 break-words font-medium text-[var(--ink)]"
                  aria-current="page"
                >
                  {crumb}
                </span>
              </li>
            </ol>
            <Link
              href={backHref}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {backLabel}
            </Link>
          </nav>
          <span className="hp-mark" aria-hidden />
          <h1 className="hp-heading text-[clamp(1.65rem,6vw,2.25rem)] sm:text-4xl">{heading}</h1>
          {subtitle ? <p className="hp-lede max-w-2xl text-sm sm:text-base">{subtitle}</p> : null}
        </Reveal>
        {children}
      </div>
    </div>
  );
}
