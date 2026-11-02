import Link from 'next/link';
import { BrandMark } from './brand-mark';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg-elevated)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <BrandMark />
          <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            Curated MCQs, a fair seven-day trial, and study tools that stay useful after answers go
            premium.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm">
          <div className="space-y-2.5">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
              Learn
            </p>
            <Link href="/questions" className="block text-[var(--ink-soft)] hover:text-[var(--ink)]">
              Questions
            </Link>
            <Link href="/documents" className="block text-[var(--ink-soft)] hover:text-[var(--ink)]">
              PDF library
            </Link>
            <Link href="/news" className="block text-[var(--ink-soft)] hover:text-[var(--ink)]">
              News
            </Link>
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
              Account
            </p>
            <Link href="/login" className="block text-[var(--ink-soft)] hover:text-[var(--ink)]">
              Sign in
            </Link>
            <Link href="/register" className="block text-[var(--ink-soft)] hover:text-[var(--ink)]">
              Start trial
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} Your Academy. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
