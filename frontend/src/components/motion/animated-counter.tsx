'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type AnimatedCounterProps = {
  /** Final integer from the database / API — never fabricated. */
  value: number;
  /** Animation length in ms (ease-out). Default ~1.3s. */
  durationMs?: number;
  /** Locale for thousand separators (default en-BD). */
  locale?: string;
  className?: string;
  /** IntersectionObserver rootMargin — fire slightly before fully on screen. */
  rootMargin?: string;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Quartic ease-out — fast start, soft settle on the exact target. */
function easeOutQuart(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 4;
}

function formatInteger(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(Math.round(n));
}

/**
 * Counts from 0 → `value` once when scrolled into view.
 * Honors `prefers-reduced-motion` (instant final value).
 */
export function AnimatedCounter({
  value,
  durationMs = 1300,
  locale = 'en-BD',
  className,
  rootMargin = '0px 0px -10% 0px',
}: AnimatedCounterProps) {
  const target = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const ref = useRef<HTMLSpanElement | null>(null);
  const [inView, setInView] = useState(false);
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Trigger once when the number enters the viewport.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion()) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Animate (or snap) whenever we are in view and the target changes.
  useEffect(() => {
    if (!inView) return;

    const reduced = prefersReducedMotion();
    const from = displayRef.current;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Zero / no-op / reduced motion → land on the exact integer immediately.
    if (reduced || target === 0 || from === target || durationMs <= 0) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const delta = target - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const next = from + delta * easeOutQuart(t);
      // Round during flight so locale formatting stays stable integers.
      const rounded = t < 1 ? Math.round(next) : target;
      displayRef.current = rounded;
      setDisplay(rounded);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        displayRef.current = target;
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [inView, target, durationMs]);

  const label = formatInteger(target, locale);

  return (
    <span
      ref={ref}
      className={cn('tabular-nums', className)}
      aria-label={label}
    >
      {formatInteger(inView ? display : 0, locale)}
    </span>
  );
}
