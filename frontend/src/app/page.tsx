import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <section className="grid gap-10 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
      <div className="space-y-6">
        <p className="text-sm font-semibold tracking-[0.22em] text-[var(--accent)] uppercase">
          Learn with clarity
        </p>
        <h1 className="max-w-xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] font-bold md:text-6xl">
          Your Academy
        </h1>
        <p className="max-w-xl text-lg text-[var(--muted)]">
          Browse curated MCQs by category, study with explanations during your seven-day trial, and
          keep practicing after — answers stay premium, learning stays open.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/register">
            <Button>Start free trial</Button>
          </Link>
          <Link href="/questions">
            <Button variant="ghost">Browse questions</Button>
          </Link>
        </div>
      </div>
      <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm text-[var(--muted)]">Included in trial</p>
        <ul className="mt-4 space-y-3 text-sm">
          <li>Full answers and explanations</li>
          <li>Category and difficulty filters</li>
          <li>Bookmarks and browsing insights</li>
          <li>Educational news and documents</li>
        </ul>
      </div>
    </section>
  );
}
