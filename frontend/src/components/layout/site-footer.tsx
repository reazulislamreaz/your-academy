import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { FooterDeveloperCredit } from './footer-developer-credit';

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/preli-question-bank', label: 'Preli bank' },
  { href: '/written-question-bank', label: 'Written bank' },
  { href: '/news', label: 'Newspaper columns' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/register', label: 'Free trial' },
  { href: '/login', label: 'Sign in' },
] as const;

/**
 * Navy footer matching the homepage design reference.
 */
export function SiteFooter() {
  return (
    <footer id="contact" className="relative mt-auto overflow-hidden bg-[var(--bg-inverse)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 50% 80% at 0% 100%, rgba(227,30,36,0.18), transparent 55%), radial-gradient(ellipse 40% 60% at 100% 0%, rgba(59,111,217,0.16), transparent 50%)',
        }}
      />
      <div className="marketing-container relative w-full py-8 sm:py-10">
        <div className="flex flex-col gap-7 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 text-center sm:text-left">
            <BrandMark inverse className="justify-center sm:justify-start" />
            <p className="text-sm font-medium tracking-wide text-white/70">
              BCS · Bank · NTRCA · Government Jobs
            </p>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-pretty text-white/55 sm:mx-0">
              Practice published MCQs, read newspaper columns, and start a 7-day free trial for
              answers and timed practice.
            </p>
          </div>

          <nav
            className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm text-white/80 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3 sm:gap-y-2"
            aria-label="Footer"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="min-h-10 touch-manipulation rounded-md px-1 py-2 text-center hover:text-white sm:min-h-0 sm:px-0 sm:py-0 sm:text-left"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-end">
            <p className="text-sm text-white/75">Get started:</p>
            <Link
              href="/register"
              className="inline-flex min-h-11 w-full max-w-xs touch-manipulation items-center justify-center rounded-full bg-[var(--highlight)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-105 sm:w-auto"
            >
              Start free trial
            </Link>
          </div>
        </div>

        <div className="mt-7 border-t border-white/15 pt-5 text-center sm:mt-8">
          <p className="text-xs text-white/55">© 2026 Your Academy. All rights reserved.</p>
          <FooterDeveloperCredit />
        </div>
      </div>
    </footer>
  );
}
