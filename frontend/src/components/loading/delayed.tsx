'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Anti-flicker: only show a loading UI after `delayMs` if still pending.
 * Fast responses never flash a skeleton/loader.
 */
export function Delayed({
  show,
  delayMs = 160,
  children,
  fallback = null,
}: {
  show: boolean;
  delayMs?: number;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [show, delayMs]);

  if (!show) return <>{fallback}</>;
  if (!visible) return null;
  return <>{children}</>;
}

/** Hook variant for composing with existing `isLoading` branches. */
export function useDeferredLoading(isLoading: boolean, delayMs = 160): boolean {
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setDeferred(false);
      return;
    }
    const id = window.setTimeout(() => setDeferred(true), delayMs);
    return () => window.clearTimeout(id);
  }, [isLoading, delayMs]);

  return isLoading && deferred;
}
