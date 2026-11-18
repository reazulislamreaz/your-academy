import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RECOVERY_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/preli-question-bank', label: 'Preli Question Bank' },
  { href: '/written-question-bank', label: 'Written Question Bank' },
] as const;

/** Simple, professional 404 — CSS motion only (no Framer Motion). */
export function NotFoundView() {
  return (
    <div className="not-found-shell relative flex flex-1 flex-col items-center justify-center">
      <div className="not-found-content relative z-[1] w-full text-center">
        <p
          className="not-found-code motion-fade-in font-display font-bold tracking-tight"
          aria-hidden
        >
          404
        </p>

        <h1 className="motion-rise mt-3 font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:mt-4 sm:text-2xl">
          Page not found
        </h1>
        <p className="motion-rise mx-auto mt-2 max-w-sm text-sm leading-relaxed text-pretty text-[var(--muted-strong)] sm:mt-3 sm:max-w-md sm:text-[0.9375rem]">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="motion-rise mt-7 flex justify-center sm:mt-8">
          <Link href="/" className="w-full max-w-xs sm:w-auto sm:max-w-none">
            <Button size="lg" className="h-11 w-full px-6 sm:h-11 sm:w-auto">
              <ArrowLeft className="size-4 shrink-0" aria-hidden />
              Back to Home
            </Button>
          </Link>
        </div>

        <nav className="not-found-quick-nav motion-fade-in" aria-label="Quick links">
          {RECOVERY_LINKS.map((link, index) => (
            <span key={link.href} className="contents">
              {index > 0 ? (
                <span className="not-found-quick-sep" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link href={link.href} className="not-found-quick-link">
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
