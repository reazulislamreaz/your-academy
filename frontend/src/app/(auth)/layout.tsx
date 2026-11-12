import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';
import { PageShell } from '@/components/motion/page-shell';
import { SupportWidget } from '@/features/support/support-widget';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-[var(--bg-inverse)] text-white lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-24 h-72 w-72 rounded-full bg-[#1e4a8c]/50 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-[var(--highlight)]/28 blur-3xl"
        />
        <BrandMark inverse priority className="relative" />
        <div className="relative max-w-md space-y-5">
          <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-white/55 uppercase">
            Your Academy
          </p>
          <p className="font-display text-4xl leading-[1.08] font-extrabold tracking-[-0.02em] xl:text-5xl">
            Study at your exam desk
          </p>
          <p className="text-base leading-relaxed text-white/68">
            Seven days of full answers and explanations. After that, the library stays open —
            correct answers stay premium.
          </p>
          <ul className="space-y-3 pt-2 text-sm text-white/78">
            <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
              WhatsApp for login only — HTTP-only cookie sessions
            </li>
            <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
              Category filters, bookmarks, and study PDFs
            </li>
            <li className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
              Fair trial — answers omitted by the API when not entitled
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Your Academy · MCQ practice</p>
      </aside>

      <div className="relative flex min-h-screen flex-col bg-[var(--bg-desk)] pt-[env(safe-area-inset-top,0px)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 40% at 100% 0%, rgba(227,30,36,0.06), transparent 55%), radial-gradient(ellipse 50% 35% at 0% 100%, rgba(0,32,80,0.07), transparent 50%)',
          }}
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
        <main className="relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-6 lg:max-w-lg lg:px-10">
          <PageShell>{children}</PageShell>
        </main>
      </div>
      <SupportWidget mode="guest" />
    </div>
  );
}
