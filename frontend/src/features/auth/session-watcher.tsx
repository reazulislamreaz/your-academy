'use client';

import { useEffect } from 'react';
import { apiFetch } from '@/lib/api/client';
import { getCookie } from '@/lib/utils';

const POLL_MS = 45_000;

function hasSessionHint(): boolean {
  return Boolean(getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token'));
}

/**
 * One device at a time (DEC-053): signs this device out promptly after the account
 * logs in elsewhere, even if the user is idle. Polls a cheap endpoint while the tab is
 * visible and re-checks when it regains focus. A 401 SESSION_REPLACED is handled in
 * apiFetch (clears cookies, shows the warning on /login). Tabs share cookies, so many
 * tabs on one device are one session.
 */
export function SessionWatcher() {
  useEffect(() => {
    let lastCheck = 0;
    const check = () => {
      if (!hasSessionHint() || document.visibilityState !== 'visible') return;
      // Focus + visibility events often fire together; one request is enough.
      if (Date.now() - lastCheck < 5_000) return;
      lastCheck = Date.now();
      apiFetch('/auth/session', { timeoutMs: 10_000 }).catch(() => undefined);
    };
    const timer = window.setInterval(check, POLL_MS);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  return null;
}
