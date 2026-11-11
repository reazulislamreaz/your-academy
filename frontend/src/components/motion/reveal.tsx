'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Delay before the reveal transition starts (ms). */
  delayMs?: number;
  /** Intersection root margin — start slightly before fully in view. */
  rootMargin?: string;
  /** Animate only once (default). Set false to re-hide when leaving viewport. */
  once?: boolean;
};

/**
 * Viewport enter animation. Respects prefers-reduced-motion via CSS (.motion-reveal).
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
  rootMargin = '0px 0px -8% 0px',
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { root: null, rootMargin, threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once, rootMargin]);

  const style = delayMs
    ? ({ '--reveal-delay': `${delayMs}ms` } as CSSProperties)
    : undefined;

  return (
    <div ref={ref} className={cn('motion-reveal', visible && 'is-visible', className)} style={style}>
      {children}
    </div>
  );
}
