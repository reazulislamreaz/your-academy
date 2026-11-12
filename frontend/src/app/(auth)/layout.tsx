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
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-[var(--highlight)]/30 blur-3xl"
        />
        <BrandMark inverse priority className="relative" />
        <div className="relative max-w-md space-y-5">
          <p className="font-display text-4xl leading-[1.1] font-extrabold tracking-tight xl:text-5xl">
            Study at your exam desk
          </p>
          <p className="text-base leading-relaxed text-white/65">
            Seven days of full answers and explanations. After that, the library stays open —
            correct answers stay premium.
          </p>
          <ul className="space-y-3 pt-2 text-sm text-white/75">
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
              WhatsApp for login only — HTTP-only cookie sessions
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
              Category filters, bookmarks, and study PDFs
            </li>
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
              Fair trial — answers omitted by the API when not entitled
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Your Academy · MCQ practice</p>
      </aside>

      <div className="flex min-h-screen flex-col bg-[var(--bg)]">
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="hidden lg:block" />
          <Link
            href="/"
            className="text-sm font-medium text-[var(--muted-strong)] hover:text-[var(--highlight)]"
          >
            Back home
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16 lg:max-w-lg lg:px-10">
          <PageShell>{children}</PageShell>
        </main>
      </div>
      <SupportWidget mode="guest" />
    </div>
  );
}
