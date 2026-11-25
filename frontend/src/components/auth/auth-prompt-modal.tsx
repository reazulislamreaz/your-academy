'use client';

import { Lock, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { LearnerThemePortal } from '@/components/theme/learner-theme-portal';
import { Button } from '@/components/ui/button';
import { loginUrlWithCallback } from '@/features/auth/return-to';
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock';
import { cn } from '@/lib/utils';

const EXIT_MS = 160;

export type AuthPromptModalProps = {
  open: boolean;
  /** Page to open after login (same-site path). */
  targetUrl: string | null;
  onClose: () => void;
  title?: string;
  message?: string;
  loginLabel?: string;
  laterLabel?: string;
};

/**
 * Reusable "log in to continue" prompt for signed-out visitors. Login goes to
 * `/login?callbackUrl=<target>`; the login / register pages send the user back there.
 * Closes on X, backdrop click or Escape; locks page scroll and traps focus while open.
 */
export function AuthPromptModal({
  open,
  targetUrl,
  onClose,
  title = 'লগইন প্রয়োজন',
  message = 'টপিক-ভিত্তিক ক্যাটাগরি দেখতে হলে আপনাকে লগইন করতে হবে।',
  loginLabel = 'লগইন করুন',
  laterLabel = 'পরে দেখবো',
}: AuthPromptModalProps) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const loginRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => setVisible(true)),
      );
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    if (!mounted) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setMounted(false);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  useBodyScrollLock(mounted);

  // Latest onClose in a ref so a parent's new inline callback never re-runs the focus effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!mounted || !visible) return;
    const prev = document.activeElement as HTMLElement | null;
    loginRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [mounted, visible]);

  if (!mounted || typeof document === 'undefined') return null;

  return (
    <LearnerThemePortal>
      <div
        className={cn(
          'ya-dialog-root fixed inset-0 z-[90] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4',
          visible && 'is-open',
        )}
        data-state={visible ? 'open' : 'closed'}
      >
        <button
          type="button"
          aria-label="বন্ধ করুন"
          tabIndex={-1}
          className="ya-dialog-backdrop absolute inset-0 cursor-pointer border-0 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          data-state={visible ? 'open' : 'closed'}
          data-scroll-lock-scrollable=""
          className={cn(
            'ya-dialog-panel relative z-10 w-full max-w-sm overflow-hidden',
            'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[var(--shadow-lg)]',
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--highlight-soft)] to-transparent"
          />
          <button
            type="button"
            aria-label="বন্ধ করুন"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full text-[var(--muted-strong)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--highlight)] focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </button>

          <div className="relative px-5 pt-8 pb-5 text-center sm:px-6 sm:pb-6">
            <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--highlight)] text-white shadow-lg">
              <Lock className="size-6" aria-hidden />
              <Sparkles
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-[var(--bg-elevated)] p-0.5 text-[var(--highlight)]"
                aria-hidden
              />
            </span>
            <h2 id={titleId} className="font-display mt-4 text-xl font-bold text-[var(--ink)]">
              {title}
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
              {message}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                ref={loginRef}
                type="button"
                className="w-full"
                onClick={() => router.push(loginUrlWithCallback(targetUrl ?? '/'))}
              >
                {loginLabel}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
                {laterLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </LearnerThemePortal>
  );
}
