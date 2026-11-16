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

export function DirectoryPageShell({
  heading,
  subtitle,
  backHref = '/',
  backLabel = 'Back to home',
  children,
}: Props) {
  return (
    <div className="relative overflow-hidden bg-[var(--bg-desk)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_var(--highlight-soft)_0%,_transparent_65%)] opacity-70"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-[1100px] space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <Reveal className="space-y-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <span
            className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
            aria-hidden
          />
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            {heading}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl text-[var(--muted-strong)]">{subtitle}</p>
          ) : null}
        </Reveal>
        {children}
      </div>
    </div>
  );
}
