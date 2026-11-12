'use client';

import { MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMe } from '@/features/auth/use-auth';
import { useSupportChat } from '@/features/support/support-chat-provider';
import { getSupportUnread } from '@/lib/api/support';
import { cn } from '@/lib/utils';

/** Header control that opens the shared Support chat widget. */
export function MessagesMenu() {
  const me = useMe();
  const { open, toggle } = useSupportChat();
  const unreadQ = useQuery({
    queryKey: ['support-unread'],
    queryFn: getSupportUnread,
    enabled: Boolean(me.data),
    refetchInterval: 60_000,
    retry: false,
  });
  const unread = unreadQ.data?.unread ?? 0;

  if (!me.data) return null;

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
      onClick={toggle}
      className={cn(
        'relative flex size-10 items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]',
        open && 'border-[var(--accent)] text-[var(--accent)]',
      )}
    >
      <MessageCircle className="size-[18px]" strokeWidth={1.75} aria-hidden />
      {unread > 0 ? (
        <span className="absolute top-1.5 right-1.5 flex min-w-[0.875rem] items-center justify-center rounded-full bg-[var(--accent)] px-0.5 text-[9px] font-bold leading-none text-[var(--accent-fg,#fff)] ring-2 ring-[var(--bg-elevated)]">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </button>
  );
}
