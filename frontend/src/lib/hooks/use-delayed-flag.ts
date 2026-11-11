'use client';

import { useEffect, useState } from 'react';

/**
 * Delays flipping `true` so ultra-fast requests never flash a skeleton.
 * Flips back to `false` immediately when `flag` clears.
 */
export function useDelayedFlag(flag: boolean, delayMs = 120): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!flag) {
      setVisible(false);
      return;
    }
    if (delayMs <= 0) {
      setVisible(true);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(id);
  }, [flag, delayMs]);

  return visible;
}
