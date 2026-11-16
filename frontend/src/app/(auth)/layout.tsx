import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';
import { PageShell } from '@/components/motion/page-shell';
import { AuthPromoPanel } from '@/features/auth/auth-promo-panel';
import { SupportWidget } from '@/features/support/support-widget';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <AuthPromoPanel className="hidden lg:flex" />

      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--bg-desk)] pt-[env(safe-area-inset-top,0px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 70% 45% at 100% -10%, rgba(227,30,36,0.08), transparent 55%), radial-gradient(ellipse 55% 40% at 0% 100%, rgba(0,32,80,0.08), transparent 50%), linear-gradient(180deg, rgba(255,255,255,0.55), transparent 40%)',
          }}
        />
        <div
          aria-hidden
          className="auth-orb-drift pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[var(--highlight)]/10 blur-3xl"
        />

        <header className="relative z-[1] flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
          <div className="lg:hidden">
            <BrandMark className="[&_img]:h-8" />
          </div>
          <div className="hidden lg:block" />
          <Link
            href="/"
            className="min-h-11 text-sm font-medium leading-[2.75rem] text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            Back home
          </Link>
        </header>

        <main className="relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-[max(3.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:max-w-lg lg:px-10">
          <PageShell motionClassName="motion-page">{children}</PageShell>
        </main>
      </div>
      <SupportWidget mode="guest" />
    </div>
  );
}
