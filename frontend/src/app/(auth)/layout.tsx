import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';
import { PageShell } from '@/components/motion/page-shell';
import { AuthPromoPanel } from '@/features/auth/auth-promo-panel';
import { SupportWidget } from '@/features/support/support-widget';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell grid min-h-svh lg:h-svh lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:overflow-hidden">
      <AuthPromoPanel className="hidden lg:flex" />

      <div className="relative flex min-h-svh flex-col overflow-x-clip bg-[var(--bg-desk)] pt-[env(safe-area-inset-top,0px)] lg:min-h-0 lg:overflow-y-auto">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 65% 40% at 100% -8%, rgba(227,30,36,0.09), transparent 55%), radial-gradient(ellipse 50% 35% at 0% 100%, rgba(0,32,80,0.07), transparent 50%)',
          }}
        />
        <div
          aria-hidden
          className="auth-orb-drift pointer-events-none absolute -top-20 -right-14 h-44 w-44 rounded-full bg-[var(--highlight)]/12 blur-3xl"
        />

        <header className="relative z-[1] flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 lg:px-8 lg:py-3.5">
          <div className="lg:hidden">
            <BrandMark className="[&_img]:h-7" />
          </div>
          <div className="hidden lg:block" />
          <Link
            href="/"
            className="text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            Back home
          </Link>
        </header>

        <main className="relative z-[1] mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:max-w-[27rem] lg:px-8 lg:py-2">
          <PageShell motionClassName="motion-page auth-form-enter">{children}</PageShell>
        </main>
      </div>
      <SupportWidget mode="guest" />
    </div>
  );
}
