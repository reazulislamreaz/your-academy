'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import type { NewsListItem } from '@/lib/api/types';
import { useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

/** Lightweight updates panel — live news + account notices (no fake notification store). */
export function UpdatesMenu() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const news = useQuery({
    queryKey: ['news-updates'],
    queryFn: () => apiFetch<NewsListItem[]>('/news'),
    enabled: Boolean(me.data),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!me.data) return null;

  const items = (news.data ?? []).slice(0, 5);
  const trialActive = me.data.access.isTrialActive;
  // Honest badge: trial ended, or there is at least one published circular.
  const showBadge = !trialActive || items.length > 0;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Updates"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex size-10 items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]',
          open && 'border-[var(--accent)] text-[var(--accent)]',
        )}
      >
        <Bell className="size-[18px]" strokeWidth={1.75} />
        {showBadge ? (
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[var(--highlight)] ring-2 ring-[var(--bg-elevated)]" />
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          className="motion-pop absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]"
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="font-display text-sm font-bold tracking-tight">Updates</p>
            <p className="text-xs text-[var(--muted-strong)]">News and account notices</p>
          </div>
          <ul className="max-h-80 divide-y divide-[var(--line)] overflow-y-auto">
            <li className="px-4 py-3 text-sm">
              <p className="font-semibold text-[var(--ink)]">
                {trialActive ? 'Trial answers unlocked' : 'Trial ended'}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted-strong)]">
                {trialActive
                  ? `Ends ${new Date(me.data.access.trialEndsAt).toLocaleString()}`
                  : 'Correct answers stay premium; browsing stays open.'}
              </p>
            </li>
            {news.isLoading ? (
              <li className="px-4 py-3 text-sm text-[var(--muted-strong)]">Loading news…</li>
            ) : null}
            {!news.isLoading && items.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[var(--muted-strong)]">No published news yet.</li>
            ) : null}
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/news/${item.slug}`}
                  className="block px-4 py-3 hover:bg-[var(--brand-wash)]"
                  onClick={() => setOpen(false)}
                >
                  <p className="line-clamp-2 text-sm font-semibold text-[var(--ink)]">{item.title}</p>
                  {item.publishedAt ? (
                    <p className="mt-0.5 text-xs text-[var(--muted-strong)]">
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--line)] px-4 py-2.5">
            <Link
              href="/news"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all news
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
