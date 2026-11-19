'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchPublicCategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import type { CategoryScope } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type BankConfig = {
  scope: CategoryScope;
  bankHref: string;
  label: string;
  browseAllLabel: string;
};

const BANKS: Record<'preli' | 'written', BankConfig> = {
  preli: {
    scope: 'PRELIMINARY',
    bankHref: '/preli-question-bank',
    label: 'Preli Question Bank',
    browseAllLabel: 'Browse all Preliminary sets',
  },
  written: {
    scope: 'WRITTEN',
    bankHref: '/written-question-bank',
    label: 'Written Question Bank',
    browseAllLabel: 'Browse all Written sets',
  },
};

const CLOSE_DELAY_MS = 180;

function bankFilterHref(bankHref: string, next: { categoryId?: string; subcategoryId?: string }) {
  const sp = new URLSearchParams();
  if (next.categoryId) sp.set('categoryId', next.categoryId);
  if (next.subcategoryId) sp.set('subcategoryId', next.subcategoryId);
  const qs = sp.toString();
  return qs ? `${bankHref}?${qs}` : bankHref;
}

/** Desktop flyout: scoped categories + subcategories for one bank only. */
export function MarketingBankNavItem({
  bank,
  active,
  linkRef,
}: {
  bank: 'preli' | 'written';
  active: boolean;
  linkRef?: (node: HTMLAnchorElement | null) => void;
}) {
  const cfg = BANKS[bank];
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 352 });

  const tree = useQuery({
    queryKey: publicCategoriesQueryKey(cfg.scope),
    queryFn: () => fetchPublicCategories(cfg.scope),
    staleTime: 60_000,
    enabled: open,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const openNow = () => {
    cancelClose();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const sync = () => {
      const rect = rootRef.current!.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 16);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      // Flush with trigger bottom — padding on the panel acts as a hover bridge
      // so the mouse can travel into the menu without a dead gap closing it.
      setCoords({ top: rect.bottom, left, width });
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const panel = document.getElementById(panelId);
      if (panel?.contains(target)) return;
      cancelClose();
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelClose();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, panelId]);

  useEffect(() => () => cancelClose(), []);

  const roots = tree.data ?? [];

  const panel =
    open && mounted
      ? createPortal(
          <div
            id={panelId}
            role="region"
            aria-label={`${cfg.label} categories`}
            className="marketing-bank-flyout fixed z-[80] w-[min(22rem,calc(100vw-1rem))] pt-2"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onMouseEnter={openNow}
            onMouseLeave={scheduleClose}
          >
            <div className="rounded-[16px] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-md)]">
              <Link
                href={cfg.bankHref}
                className="mb-2 block cursor-pointer rounded-[12px] bg-[var(--bg-muted)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--highlight-soft)]"
                onClick={() => {
                  cancelClose();
                  setOpen(false);
                }}
              >
                {cfg.browseAllLabel}
              </Link>

              {tree.isLoading ? (
                <p className="px-2 py-3 text-sm text-[var(--muted-strong)]">Loading categories…</p>
              ) : roots.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[var(--muted-strong)]">
                  No {cfg.scope === 'WRITTEN' ? 'Written' : 'Preliminary'} categories yet.
                </p>
              ) : (
                <ul className="max-h-[min(24rem,60vh)] space-y-2 overflow-y-auto overscroll-contain pr-1">
                  {roots.map((root) => (
                    <li key={root.id}>
                      <Link
                        href={bankFilterHref(cfg.bankHref, { categoryId: root.id })}
                        className="block cursor-pointer rounded-[10px] px-2.5 py-1.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-muted)]"
                        onClick={() => {
                          cancelClose();
                          setOpen(false);
                        }}
                      >
                        {root.name}
                      </Link>
                      {(root.children ?? []).length > 0 ? (
                        <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-[var(--line)] pl-2">
                          {root.children.map((child) => (
                            <li key={child.id}>
                              <Link
                                href={bankFilterHref(cfg.bankHref, {
                                  categoryId: root.id,
                                  subcategoryId: child.id,
                                })}
                                className="block cursor-pointer rounded-[8px] px-2 py-1 text-[0.8125rem] text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
                                onClick={() => {
                                  cancelClose();
                                  setOpen(false);
                                }}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="marketing-bank-nav relative"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={cfg.bankHref}
        aria-current={active ? 'page' : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        ref={linkRef}
        className="marketing-nav-link inline-flex items-center gap-1"
        onFocus={openNow}
      >
        <span>{cfg.label}</span>
        <ChevronDown
          className={cn('size-3.5 opacity-70 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </Link>
      {panel}
    </div>
  );
}

/** Mobile/tablet accordion section for one bank’s scoped taxonomy. */
export function MarketingBankMobileSection({
  bank,
  active,
  onNavigate,
}: {
  bank: 'preli' | 'written';
  active: boolean;
  onNavigate?: () => void;
}) {
  const cfg = BANKS[bank];
  const [expanded, setExpanded] = useState(active);
  const tree = useQuery({
    queryKey: publicCategoriesQueryKey(cfg.scope),
    queryFn: () => fetchPublicCategories(cfg.scope),
    staleTime: 60_000,
    enabled: expanded,
  });
  const roots = tree.data ?? [];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
      <div className="flex items-stretch">
        <Link
          href={cfg.bankHref}
          aria-current={active ? 'page' : undefined}
          onClick={onNavigate}
          className={cn(
            'min-w-0 flex-1 cursor-pointer px-3 py-3 text-[0.9375rem] font-semibold',
            active ? 'text-[var(--highlight)]' : 'text-[var(--ink)]',
          )}
        >
          {cfg.label}
        </Link>
        <button
          type="button"
          className="shrink-0 cursor-pointer px-3 text-[var(--muted-strong)]"
          aria-expanded={expanded}
          aria-label={expanded ? `Hide ${cfg.label} categories` : `Show ${cfg.label} categories`}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
      {expanded ? (
        <div className="border-t border-[var(--line)] px-2 pb-2 pt-1">
          <Link
            href={cfg.bankHref}
            onClick={onNavigate}
            className="block cursor-pointer rounded-[10px] px-2 py-2 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-muted)]"
          >
            {cfg.browseAllLabel}
          </Link>
          {tree.isLoading ? (
            <p className="px-2 py-2 text-sm text-[var(--muted)]">Loading…</p>
          ) : roots.length === 0 ? (
            <p className="px-2 py-2 text-sm text-[var(--muted)]">
              No {cfg.scope === 'WRITTEN' ? 'Written' : 'Preliminary'} categories yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {roots.map((root) => (
                <li key={root.id}>
                  <Link
                    href={bankFilterHref(cfg.bankHref, { categoryId: root.id })}
                    onClick={onNavigate}
                    className="block cursor-pointer rounded-[10px] px-2 py-1.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-muted)]"
                  >
                    {root.name}
                  </Link>
                  {(root.children ?? []).map((child) => (
                    <Link
                      key={child.id}
                      href={bankFilterHref(cfg.bankHref, {
                        categoryId: root.id,
                        subcategoryId: child.id,
                      })}
                      onClick={onNavigate}
                      className="ml-3 block cursor-pointer rounded-[8px] px-2 py-1 text-[0.8125rem] text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-muted)]"
                    >
                      {child.name}
                    </Link>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
