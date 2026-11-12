import Link from 'next/link';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Stay-updated strip. No newsletter API yet — honest CTA to register instead of a fake form.
 */
export function NewsletterBar() {
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
            <p className="font-display text-xl font-bold tracking-tight">Stay updated</p>
            <p className="mt-0.5 max-w-md text-sm leading-relaxed text-white/65">
              Create a free account for a seven-day trial with full answers and explanations.
              Email newsletters aren&apos;t live yet.
            </p>
          </div>
        </div>
        <Link href="/register" className="w-full sm:w-auto">
          <Button className="h-11 w-full rounded-full px-6 sm:w-auto">Start free trial</Button>
        </Link>
      </div>
    </div>
  );
}
