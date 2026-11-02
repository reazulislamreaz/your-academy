import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-6">
        <BrandMark />
        <Link href="/" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]">
          Back home
        </Link>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-6 pb-16">{children}</main>
    </div>
  );
}
