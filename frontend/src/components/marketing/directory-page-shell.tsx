import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Reveal } from '@/components/motion/reveal';

type Props = {
  heading: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
};

/** Shared chrome for All Categories / All Topics — matches homepage marketing rail. */
export function DirectoryPageShell({
  heading,
  subtitle,
  backHref = '/',
  backLabel = 'Back to home',
  children,
}: Props) {
  return (
    <div className="homepage-shell min-h-[70vh]">
      <div className="marketing-container space-y-8 py-10 sm:py-14">
        <Reveal className="space-y-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <span className="hp-mark" aria-hidden />
          <h1 className="hp-heading text-3xl sm:text-4xl">{heading}</h1>
          {subtitle ? <p className="hp-lede max-w-2xl text-base">{subtitle}</p> : null}
        </Reveal>
        {children}
      </div>
    </div>
  );
}
