import Link from 'next/link';
import { BrandMark } from './brand-mark';

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#contact', label: 'Contact' },
  { href: '/register', label: 'Start free trial' },
  { href: '/login', label: 'Sign in' },
] as const;

/**
 * Navy footer matching the homepage design reference.
 */
export function SiteFooter() {
  return (
    <footer id="contact" className="mt-auto bg-[var(--bg-inverse)] text-white">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 text-center sm:text-left">
            <BrandMark inverse className="justify-center sm:justify-start" />
            <p className="text-sm font-medium tracking-wide text-white/70">
              Learn - Practice - Get Success
            </p>
          </div>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/80"
            aria-label="Footer"
          >
            {FOOTER_LINKS.map((link, i) => (
              <span key={link.label} className="inline-flex items-center gap-3">
                {i > 0 ? (
                  <span className="hidden text-white/30 sm:inline" aria-hidden>
                    |
                  </span>
                ) : null}
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center justify-center gap-3 lg:justify-end">
            <p className="text-sm text-white/75">Get started:</p>
            <Link
              href="/register"
              className="rounded-full bg-[var(--highlight)] px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
            >
              Free trial
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-5 text-center">
          <p className="text-xs text-white/55">© 2025 Your Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
