'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { useMe } from '@/features/auth/use-auth';
import { isSafeInternalPath } from '@/features/auth/return-to';
import { AuthPromptModal, type AuthPromptModalProps } from './auth-prompt-modal';

/**
 * Wrap a block of in-app links (cards, "View All") that need an account. Signed-in users
 * navigate as usual. Signed-out visitors stay on the page: the click is stopped (capture
 * phase, before next/link handles it), the target is remembered and `AuthPromptModal` opens.
 * UX only — the pages and API keep their own guards.
 */
export function AuthGatedLinks({
  children,
  className,
  modal,
}: {
  children: ReactNode;
  className?: string;
  modal?: Pick<AuthPromptModalProps, 'title' | 'message' | 'loginLabel' | 'laterLabel'>;
}) {
  const me = useMe();
  const [target, setTarget] = useState<string | null>(null);
  // While a session check is still running, let the click through — the route guard decides.
  const signedOut = !me.data && !me.isFetching;

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!signedOut || e.button !== 0) return;
    const anchor = (e.target as HTMLElement).closest('a[href]');
    if (!anchor || !e.currentTarget.contains(anchor)) return;
    const href = anchor.getAttribute('href');
    if (!isSafeInternalPath(href)) return; // external links are not gated
    e.preventDefault();
    e.stopPropagation();
    setTarget(href);
  };

  return (
    <div className={className} onClickCapture={onClickCapture}>
      {children}
      <AuthPromptModal
        open={target !== null}
        targetUrl={target}
        onClose={() => setTarget(null)}
        {...modal}
      />
    </div>
  );
}
