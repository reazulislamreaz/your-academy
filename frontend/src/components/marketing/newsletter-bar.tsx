import Link from 'next/link';
import { Send } from 'lucide-react';
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
    <div className="rounded-[18px] bg-[var(--bg-inverse)] px-5 py-5 text-white shadow-[var(--shadow)] sm:px-7 sm:py-6">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10"
          >
            <Send className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">{newsletter.title}</p>
            <p className="mt-0.5 max-w-md text-sm leading-relaxed text-white/65">
              {newsletter.body}
            </p>
          </div>
        </div>
        {newsletter.cta.visible ? (
          <Link href={newsletter.cta.href} className="w-full sm:w-auto">
            <Button className="h-11 w-full rounded-full px-6 sm:w-auto">
              {newsletter.cta.label}
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
