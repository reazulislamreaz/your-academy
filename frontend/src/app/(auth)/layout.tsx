import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { PageShell } from '@/components/motion/page-shell';
import { AuthPromoPanel } from '@/features/auth/auth-promo-panel';
import { SupportWidget } from '@/features/support/support-widget';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell grid min-h-svh lg:h-svh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:overflow-hidden">
      <AuthPromoPanel className="hidden lg:flex" />

      <div className="auth-form-pane relative flex min-h-svh flex-col overflow-x-clip pt-[env(safe-area-inset-top,0px)] lg:min-h-0 lg:overflow-y-auto">
        <header className="relative z-[1] flex shrink-0 items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8 lg:py-5">
          <div className="lg:hidden">
            <BrandMark className="[&_img]:h-7" />
          </div>
          <div className="hidden lg:block" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            <Home className="size-3.5" aria-hidden strokeWidth={2} />
            Back home
          </Link>
        </header>

        <main className="relative z-[1] mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:max-w-[27rem] lg:px-10 lg:py-2">
          <PageShell motionClassName="motion-page auth-form-enter">{children}</PageShell>
        </main>
      </div>
      <SupportWidget mode="guest" />
    </div>
  );
}
