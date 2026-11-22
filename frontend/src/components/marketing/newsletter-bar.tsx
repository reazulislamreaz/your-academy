import Link from 'next/link';
import { ArrowRight, Send } from 'lucide-react';
import type { HomepagePayload } from '@your-academy/shared';
import { Button } from '@/components/ui/button';

type Props = {
  newsletter: HomepagePayload['newsletter'];
};

/**
 * Stay-updated strip. Content from homepage CMS (DEC-038).
 */
export function NewsletterBar({ newsletter }: Props) {
  if (!newsletter.visible) return null;

  return (
    <div className="hp-cta-panel overflow-hidden px-6 py-7 text-white sm:px-8 sm:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[color-mix(in_srgb,var(--highlight)_18%,transparent)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-1/4 h-40 w-56 rounded-full bg-sky-400/10 blur-3xl"
      />

      <div className="relative z-[1] grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
        <div className="flex min-w-0 items-start gap-4 sm:items-center sm:gap-5">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
          >
            <Send className="h-5 w-5 text-white" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 space-y-1.5">
            <p className="font-display text-[1.35rem] font-bold tracking-tight text-balance sm:text-2xl">
              {newsletter.title}
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-pretty text-white/70 sm:text-[0.9375rem]">
              {newsletter.body}
            </p>
          </div>
        </div>

        {newsletter.cta.visible ? (
          <Link href={newsletter.cta.href} className="w-full shrink-0 sm:w-auto lg:justify-self-end">
            <Button className="group h-11 w-full rounded-full px-7 font-semibold shadow-[var(--hp-cta-shadow)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:w-auto">
              {newsletter.cta.label}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
