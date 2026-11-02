'use client';

import { useEffect, useRef } from 'react';
import { ApiError, apiFetch } from '@/lib/api/client';
import { getCookie } from '@/lib/utils';
import { useMe } from '@/features/auth/use-auth';

const HEARTBEAT_MS = 30_000;
/** DEC-009 current assumption: 120s without interaction pauses accrual. */
const IDLE_MS = 120_000;
const INSTANCE_KEY = 'ya_client_instance_id';

function getClientInstanceId(): string {
  try {
    let id = sessionStorage.getItem(INSTANCE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(INSTANCE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Starts a browsing session while authenticated and heartbeats every 30s
 * when the tab is visible and the user is not idle.
 */
export function BrowsingHeartbeat() {
  const me = useMe();
  const sessionIdRef = useRef<string | null>(null);
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    if (!me.data) {
      sessionIdRef.current = null;
      return;
    }

    const clientInstanceId = getClientInstanceId();
    let cancelled = false;

    const markActive = () => {
      lastActiveRef.current = Date.now();
    };

    window.addEventListener('pointerdown', markActive);
    window.addEventListener('keydown', markActive);

    async function ensureSession() {
      if (sessionIdRef.current || cancelled) return;
      try {
        const session = await apiFetch<{ id: string }>('/analytics/sessions', {
          method: 'POST',
          body: JSON.stringify({ clientInstanceId }),
        });
        if (!cancelled) sessionIdRef.current = session.id;
      } catch {
        // Non-fatal — stats simply won't accrue.
      }
    }

    async function beat() {
      if (cancelled) return;
      let id = sessionIdRef.current;
      if (!id) {
        await ensureSession();
        id = sessionIdRef.current;
      }
      if (!id) return;

      const idle = Date.now() - lastActiveRef.current > IDLE_MS;
      const hidden = document.visibilityState === 'hidden';
      try {
        await apiFetch(`/analytics/sessions/${id}/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({
            visibilityState: idle || hidden ? 'hidden' : 'visible',
            clientInstanceId,
          }),
        });
      } catch (err) {
        if (err instanceof ApiError && err.code === 'SESSION_NOT_FOUND') {
          sessionIdRef.current = null;
          await ensureSession();
          return;
        }
        sessionIdRef.current = null;
      }
    }

    void ensureSession().then(() => void beat());
    const interval = window.setInterval(() => void beat(), HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const endSession = () => {
      const id = sessionIdRef.current;
      if (!id) return;
      const csrf = getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrf) headers['X-CSRF-Token'] = csrf;
      void fetch(`/api/v1/analytics/sessions/${id}/end`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: '{}',
        keepalive: true,
      });
      sessionIdRef.current = null;
    };

    window.addEventListener('pagehide', endSession);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', endSession);
      endSession();
    };
  }, [me.data?.id]);

  return null;
}
