'use client';

import { Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent, type UIEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  listSupportMessages,
  markSupportRead,
  sendSupportMessage,
  uploadSupportAttachment,
  type SupportConversation,
  type SupportMessage,
} from '@/lib/api/support';
import { cn } from '@/lib/utils';
import {
  SupportAttachmentBubble,
  SupportPendingAttachmentPreview,
} from './support-attachment';
import {
  formatDayLabel,
  formatMessageTime,
  mergeSupportMessage,
  NEAR_BOTTOM_PX,
  newSupportClientId,
  prependOlderMessages,
  sortMessagesChronological,
} from './support-message-utils';
import { useSupportSocket } from './support-socket';

type Props = {
  conversation: SupportConversation;
  mode: 'learner' | 'guest' | 'admin';
  onClose?: () => void;
  className?: string;
  /** When admin, use admin REST for send/list (same shapes). */
  adminSend?: (
    conversationId: string,
    body: {
      body?: string;
      clientMessageId?: string;
      mediaAssetId?: string;
      originalFilename?: string;
    },
  ) => Promise<SupportMessage>;
  adminList?: typeof listSupportMessages;
  adminMarkRead?: (conversationId: string) => Promise<{ ok: boolean; readAt?: string }>;
};

export function SupportChatWindow({
  conversation,
  mode,
  onClose,
  className,
  adminSend,
  adminList,
  adminMarkRead,
}: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachAbort = useRef(0);
  const stickToBottom = useRef(true);
  const preserveScroll = useRef<{ height: number; top: number } | null>(null);

  const listFn = adminList ?? listSupportMessages;
  const sendFn = adminSend ?? sendSupportMessage;
  const readFn = adminMarkRead ?? markSupportRead;

  const mergeMessage = useCallback((incoming: SupportMessage) => {
    setMessages((prev) => mergeSupportMessage(prev, incoming));
    if (stickToBottom.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, []);

  const reloadThread = useCallback(async () => {
    const res = await listFn(conversation.id);
    setMessages(sortMessagesChronological(res.data));
    setNextCursor(res.pagination?.nextCursor ?? null);
    stickToBottom.current = true;
    await readFn(conversation.id);
  }, [conversation.id, listFn, readFn]);

  const socketActionsRef = useRef<{
    joinConversation: (id: string) => void;
    markRead: (id: string) => void;
  } | null>(null);

  const socket = useSupportSocket(true, {
    onMessageNew: (m) => {
      if (m.conversationId !== conversation.id) return;
      mergeMessage(m);
      void readFn(conversation.id);
      socketActionsRef.current?.markRead(conversation.id);
    },
    onMessageAck: ({ message }) => {
      if (message.conversationId !== conversation.id) return;
      mergeMessage(message);
    },
    onTyping: (p) => {
      if (p.conversationId !== conversation.id) return;
      if (mode === 'admin' && p.actorKind === 'admin') return;
      if (mode !== 'admin' && p.actorKind !== 'admin') return;
      setTyping(p.typing);
    },
    onReconnect: () => {
      socketActionsRef.current?.joinConversation(conversation.id);
      void reloadThread().catch(() => undefined);
    },
  });
  socketActionsRef.current = {
    joinConversation: socket.joinConversation,
    markRead: socket.markRead,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      stickToBottom.current = true;
      try {
        await reloadThread();
        if (!cancelled) socket.markRead(conversation.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally keyed on conversation id only — socket/list helpers are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    socket.joinConversation(conversation.id);
    return () => socket.leaveConversation(conversation.id);
  }, [conversation.id, socket.connected]);

  useEffect(() => {
    if (!loading && stickToBottom.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading]);

  useEffect(() => {
    const el = scrollRef.current;
    const saved = preserveScroll.current;
    if (!el || !saved) return;
    el.scrollTop = saved.top + (el.scrollHeight - saved.height);
    preserveScroll.current = null;
  }, [messages]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < NEAR_BOTTOM_PX;
  };

  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    const el = scrollRef.current;
    if (el) preserveScroll.current = { height: el.scrollHeight, top: el.scrollTop };
    stickToBottom.current = false;
    setLoadingOlder(true);
    try {
      const res = await listFn(conversation.id, nextCursor);
      setMessages((prev) => prependOlderMessages(prev, res.data));
      setNextCursor(res.pagination?.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load earlier messages');
      preserveScroll.current = null;
    } finally {
      setLoadingOlder(false);
    }
  };

  const closed = conversation.status === 'CLOSED' || conversation.status === 'ARCHIVED';

  const onDraftChange = (value: string) => {
    setDraft(value);
    socket.setTyping(conversation.id, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.setTyping(conversation.id, false), 1200);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending || closed) return;
    setSending(true);
    setError(null);
    const clientMessageId = newSupportClientId();
    const optimistic: SupportMessage = {
      id: `tmp-${clientMessageId}`,
      conversationId: conversation.id,
      senderType: mode === 'admin' ? 'ADMIN' : mode === 'guest' ? 'GUEST' : 'USER',
      senderUserId: null,
      clientMessageId,
      kind: 'TEXT',
      body: text,
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
      attachments: [],
    };
    stickToBottom.current = true;
    setMessages((prev) => mergeSupportMessage(prev, optimistic));
    setDraft('');
    socket.setTyping(conversation.id, false);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));

    try {
      if (socket.connected) {
        socket.sendMessage({ conversationId: conversation.id, body: text, clientMessageId });
      } else {
        mergeMessage(await sendFn(conversation.id, { body: text, clientMessageId }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const clearPending = () => {
    attachAbort.current += 1;
    setPendingFile(null);
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onAttach = async (file: File | null) => {
    if (!file || closed) return;
    const ticket = ++attachAbort.current;
    setPendingFile(file);
    const localUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPendingPreviewUrl(localUrl);
    setSending(true);
    setError(null);
    stickToBottom.current = true;
    try {
      const asset = await uploadSupportAttachment(file);
      if (ticket !== attachAbort.current) return;
      const clientMessageId = newSupportClientId();
      const payload = {
        clientMessageId,
        mediaAssetId: asset.id,
        originalFilename: file.name,
        body: draft.trim() || undefined,
      };
      if (localUrl) {
        mergeMessage({
          id: `tmp-${clientMessageId}`,
          conversationId: conversation.id,
          senderType: mode === 'admin' ? 'ADMIN' : mode === 'guest' ? 'GUEST' : 'USER',
          senderUserId: null,
          clientMessageId,
          kind: 'ATTACHMENT',
          body: payload.body ?? null,
          deliveredAt: null,
          readAt: null,
          createdAt: new Date().toISOString(),
          attachments: [
            {
              id: `tmp-att-${clientMessageId}`,
              mediaAssetId: asset.id,
              originalFilename: file.name,
              mimeType: file.type || 'application/octet-stream',
              bytes: file.size,
              downloadUrl: localUrl,
            },
          ],
        });
      }
      if (socket.connected && !adminSend) {
        socket.sendMessage({ conversationId: conversation.id, ...payload });
      } else {
        mergeMessage(await sendFn(conversation.id, payload));
      }
      setDraft('');
    } catch (err) {
      if (ticket === attachAbort.current) {
        setError(err instanceof Error ? err.message : 'Attachment failed');
      }
    } finally {
      if (ticket === attachAbort.current) {
        setSending(false);
        setPendingFile(null);
        if (fileRef.current) fileRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const messageGroups = (() => {
    const groups: Array<{ day: string; items: SupportMessage[] }> = [];
    for (const m of messages) {
      const day = formatDayLabel(m.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.day !== day) groups.push({ day, items: [m] });
      else last.items.push(m);
    }
    return groups;
  })();

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg,1rem)] border border-[var(--line)] bg-[var(--bg-elevated)]',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">
            {conversation.subject ?? 'Support'}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">
            {conversation.participantName ?? 'You'} · {conversation.status.toLowerCase()}
            {socket.connected ? '' : ' · reconnecting…'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 overflow-y-auto bg-[var(--bg-soft,#f8fafc)] px-3 py-3 sm:px-4"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--line) 55%, transparent) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      >
        {nextCursor ? (
          <div className="mb-3 flex justify-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingOlder}
              onClick={() => void loadOlder()}
              className="bg-[var(--bg-elevated)]/90 shadow-sm"
            >
              {loadingOlder ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading…
                </>
              ) : (
                'Load earlier messages'
              )}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 text-[var(--muted)]">
            <Loader2 className="size-5 animate-spin" />
            <p className="text-sm">Loading conversation…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium text-[var(--ink)]">No messages yet</p>
            <p className="text-xs text-[var(--muted)]">Say hello — an admin will reply soon.</p>
          </div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.day} className="mb-4 space-y-1.5">
              <div className="sticky top-1 z-[1] flex justify-center py-1">
                <span className="rounded-full bg-[var(--bg-elevated)]/95 px-3 py-1 text-[11px] font-medium text-[var(--muted)] shadow-sm ring-1 ring-[var(--line)]">
                  {group.day}
                </span>
              </div>
              {group.items.map((m) => {
                const mine =
                  (mode === 'admin' && m.senderType === 'ADMIN') ||
                  (mode !== 'admin' && (m.senderType === 'USER' || m.senderType === 'GUEST'));
                const pending = m.id.startsWith('tmp-');
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'flex motion-safe:animate-[ya-rise_0.28s_ease-out]',
                      mine ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[min(22rem,85%)] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm',
                        mine
                          ? 'rounded-br-md bg-[var(--accent)] text-[var(--accent-fg,#fff)]'
                          : 'rounded-bl-md bg-[var(--bg-elevated)] text-[var(--ink)] ring-1 ring-[var(--line)]',
                        pending && 'opacity-80',
                      )}
                    >
                      {m.body ? (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      ) : null}
                      {m.attachments.map((a) => (
                        <SupportAttachmentBubble key={a.id} attachment={a} mine={mine} />
                      ))}
                      <p
                        className={cn(
                          'mt-1 text-right text-[10px] tabular-nums',
                          mine ? 'opacity-70' : 'text-[var(--muted)]',
                        )}
                      >
                        {formatMessageTime(m.createdAt)}
                        {pending ? ' · sending' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {typing ? (
          <div className="mb-2 flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-[var(--bg-elevated)] px-3.5 py-2.5 shadow-sm ring-1 ring-[var(--line)]">
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:0ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:150ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-[var(--line)] bg-[var(--danger-soft,#fef2f2)] px-4 py-2 text-xs text-[var(--danger-fg,#b91c1c)]">
          {error}
        </p>
      ) : null}

      {pendingFile ? (
        <SupportPendingAttachmentPreview
          file={pendingFile}
          previewUrl={pendingPreviewUrl}
          onClear={clearPending}
        />
      ) : null}

      <form
        onSubmit={submit}
        className="flex items-end gap-2 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-3"
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => void onAttach(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          disabled={closed || sending}
          aria-label="Attach file"
          onClick={() => fileRef.current?.click()}
          className="mb-0.5 rounded-xl p-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] disabled:opacity-40"
        >
          <Paperclip className="size-4" />
        </button>
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={closed ? 'Conversation closed' : 'Write a message…'}
          disabled={closed || sending}
          rows={1}
          className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-2xl"
        />
        <Button
          type="submit"
          size="icon"
          disabled={closed || sending || !draft.trim()}
          aria-label="Send"
          className="mb-0.5 size-10 shrink-0 rounded-full"
        >
          {sending && !draft.trim() ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
