'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

/**
 * Header chat control matching the dashboard reference.
 * Product has no messaging backend — panel stays honest (no fake inbox).
 */
export function MessagesMenu() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Messages"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex size-10 items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]',
          open && 'border-[var(--accent)] text-[var(--accent)]',
        )}
      >
        <MessageCircle className="size-[18px]" strokeWidth={1.75} aria-hidden />
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg-elevated)]" />
      </button>
      {open ? (
        <div
          id={panelId}
          className="motion-pop absolute right-0 z-40 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]"
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="text-sm font-semibold tracking-tight text-[var(--ink)]">Messages</p>
            <p className="text-xs text-[var(--muted)]">Direct chat is not available yet</p>
          </div>
          <div className="space-y-2 px-4 py-4 text-sm text-[var(--ink-soft)]">
            <p>Use Updates for circulars, or browse News for exam notices.</p>
            <Link
              href="/news"
              className="inline-flex font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
              onClick={() => setOpen(false)}
            >
              Open news
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
