import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { PageShell } from '@/components/motion/page-shell';
import { AuthPromoPanel } from '@/features/auth/auth-promo-panel';
import { SupportWidgetLazy } from '@/features/support/support-widget-lazy';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell grid min-h-svh lg:h-svh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:overflow-hidden xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
      <AuthPromoPanel className="hidden lg:flex" />

      <div className="auth-form-pane relative flex min-h-svh flex-col overflow-x-clip pt-[env(safe-area-inset-top,0px)] lg:min-h-0 lg:overflow-y-auto">
        <header className="relative z-[1] shrink-0 px-4 pt-3 sm:px-6 lg:px-8 lg:pt-5">
          {/* Phones / tablets: compact navy brand band instead of the promo panel. */}
          <div className="auth-mobile-hero flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark inverse className="shrink-0 [&_img]:h-8" />
              <p className="min-w-0 font-display text-[0.8125rem] leading-tight font-semibold sm:text-sm">
                Prepare <span className="text-[#ff8a8e]">Smarter</span>. Achieve More.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              <Home className="size-3.5" aria-hidden strokeWidth={2} />
              <span className="max-sm:sr-only">Back home</span>
            </Link>
          </div>

          <div className="hidden justify-end lg:flex">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 text-sm font-semibold text-[var(--ink-soft)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none"
            >
              <Home className="size-3.5" aria-hidden strokeWidth={2} />
              Back home
            </Link>
          </div>
        </header>

        <main
          id="main-content"
          className="relative z-[1] mx-auto flex w-full max-w-[27.5rem] flex-1 flex-col justify-start px-4 pt-9 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-14 lg:max-w-[28rem] lg:justify-center lg:px-8 lg:py-6"
        >
          <PageShell motionClassName="motion-page auth-form-enter">{children}</PageShell>
        </main>
      </div>
      <SupportWidgetLazy mode="guest" />
    </div>
  );
}
