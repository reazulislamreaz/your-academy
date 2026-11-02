import Link from 'next/link';
import { BrandMark } from './brand-mark';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg-elevated)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <BrandMark />
          <p className="max-w-sm text-sm text-[var(--muted)]">
            Curated MCQs, a fair seven-day trial, and study tools that stay useful after answers go
            premium.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-[var(--ink)]">Learn</p>
            <Link href="/questions" className="block text-[var(--muted)] hover:text-[var(--ink)]">
              Questions
            </Link>
            <Link href="/documents" className="block text-[var(--muted)] hover:text-[var(--ink)]">
              PDF library
            </Link>
            <Link href="/news" className="block text-[var(--muted)] hover:text-[var(--ink)]">
              News
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[var(--ink)]">Account</p>
            <Link href="/login" className="block text-[var(--muted)] hover:text-[var(--ink)]">
              Sign in
            </Link>
            <Link href="/register" className="block text-[var(--muted)] hover:text-[var(--ink)]">
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
