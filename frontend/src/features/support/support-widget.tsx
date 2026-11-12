'use client';

import { MessageCircle, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createGuestSession,
  getGuestMe,
  getOrCreateMyConversation,
  getSupportUnread,
  type SupportConversation,
} from '@/lib/api/support';
import { cn, getCookie } from '@/lib/utils';

const SupportChatWindow = dynamic(
  () => import('./support-chat-window').then((m) => m.SupportChatWindow),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--muted)]">
        Loading chat…
      </div>
    ),
  },
);

type Mode = 'learner' | 'guest' | 'auto';

type Props = {
  /** learner = auth required path; guest = marketing; auto = try me then guest */
  mode?: Mode;
  /** Controlled open from header Messages button */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide floating FAB when header controls open */
  hideFab?: boolean;
  className?: string;
};

export function SupportWidget({
  mode = 'auto',
  open: openProp,
  onOpenChange,
  hideFab = false,
  className,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      onOpenChange?.(v);
      if (openProp === undefined) setInternalOpen(v);
    },
    [onOpenChange, openProp],
  );

  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [needsGuestGate, setNeedsGuestGate] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [resolvedMode, setResolvedMode] = useState<'learner' | 'guest'>(
    mode === 'guest' ? 'guest' : 'learner',
  );

  const canPollUnread =
    mode === 'learner'
      ? Boolean(getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token'))
      : mode === 'guest'
        ? Boolean(getCookie('support_guest_token'))
        : Boolean(
            getCookie(process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? 'csrf_token') ||
              getCookie('support_guest_token'),
          );

  const unreadQ = useQuery({
    queryKey: ['support-unread', mode],
    queryFn: getSupportUnread,
    enabled: canPollUnread,
    refetchInterval: canPollUnread ? 60_000 : false,
    retry: false,
  });
  const unread = unreadQ.data?.unread ?? 0;

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    try {
      if (mode === 'guest') {
        const guest = await getGuestMe();
        if (!guest) {
          setNeedsGuestGate(true);
          setResolvedMode('guest');
          return;
        }
        setResolvedMode('guest');
        setNeedsGuestGate(false);
        setConversation(await getOrCreateMyConversation());
        return;
      }

      if (mode === 'learner') {
        setResolvedMode('learner');
        setNeedsGuestGate(false);
        setConversation(await getOrCreateMyConversation());
        return;
      }

      // auto: try authenticated conversation first
      try {
        const conv = await getOrCreateMyConversation();
        setResolvedMode('learner');
        setNeedsGuestGate(false);
        setConversation(conv);
      } catch {
        const guest = await getGuestMe();
        if (!guest) {
          setNeedsGuestGate(true);
          setResolvedMode('guest');
          return;
        }
        setResolvedMode('guest');
        setNeedsGuestGate(false);
        setConversation(await getOrCreateMyConversation());
      }
    } catch (e) {
      setBootError(e instanceof Error ? e.message : 'Could not start chat');
    } finally {
      setBooting(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    void boot();
  }, [open, boot]);

  const submitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);
    try {
      await createGuestSession({ name: guestName.trim(), whatsappNumber: guestWhatsapp.trim() });
      setNeedsGuestGate(false);
      setConversation(await getOrCreateMyConversation());
    } catch (err) {
      setGateError(err instanceof Error ? err.message : 'Could not start session');
    }
  };

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 bottom-0 z-50', className)}>
      <div className="pointer-events-auto absolute right-4 bottom-4 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
        {open ? (
          <div className="flex h-[min(32rem,calc(100vh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]">
            {booting ? (
              <div className="flex flex-1 items-center justify-center p-6 text-sm text-[var(--muted)]">
                Connecting…
              </div>
            ) : needsGuestGate ? (
              <form onSubmit={submitGuest} className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Chat with support</p>
                    <p className="text-xs text-[var(--muted)]">
                      Share your name and WhatsApp so we can help.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg-muted)]"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-guest-name">Name</Label>
                  <Input
                    id="support-guest-name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    minLength={2}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-guest-wa">WhatsApp</Label>
                  <Input
                    id="support-guest-wa"
                    value={guestWhatsapp}
                    onChange={(e) => setGuestWhatsapp(e.target.value)}
                    placeholder="+8801…"
                    required
                    autoComplete="tel"
                  />
                </div>
                {gateError ? <p className="text-xs text-red-600">{gateError}</p> : null}
                <Button type="submit" className="mt-auto w-full">
                  Start chat
                </Button>
              </form>
            ) : bootError ? (
              <div className="flex flex-1 flex-col gap-3 p-4">
                <p className="text-sm text-red-600">{bootError}</p>
                <Button type="button" variant="outline" onClick={() => void boot()}>
                  Retry
                </Button>
              </div>
            ) : conversation ? (
              <SupportChatWindow
                conversation={conversation}
                mode={resolvedMode}
                onClose={() => setOpen(false)}
                className="h-full rounded-none border-0"
              />
            ) : null}
          </div>
        ) : null}

        {!hideFab ? (
          <button
            type="button"
            aria-label={open ? 'Close support chat' : 'Open support chat'}
            onClick={() => setOpen(!open)}
            className={cn(
              'relative flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-fg,#fff)] shadow-[var(--shadow-lg)] transition-transform hover:scale-[1.03] active:scale-[0.98]',
            )}
          >
            {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
            {!open && unread > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}
