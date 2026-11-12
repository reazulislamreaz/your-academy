'use client';

import { Paperclip, SendHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
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
import { useSupportSocket } from './support-socket';

function newClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listFn = adminList ?? listSupportMessages;
  const sendFn = adminSend ?? sendSupportMessage;
  const readFn = adminMarkRead ?? markSupportRead;

  const mergeMessage = useCallback((incoming: SupportMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      if (
        incoming.clientMessageId &&
        prev.some((m) => m.clientMessageId === incoming.clientMessageId)
      ) {
        return prev.map((m) =>
          m.clientMessageId === incoming.clientMessageId ? incoming : m,
        );
      }
      return [...prev, incoming];
    });
  }, []);

  const socket = useSupportSocket(true, {
    onMessageNew: (m) => {
      if (m.conversationId !== conversation.id) return;
      mergeMessage(m);
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
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listFn(conversation.id);
        if (!cancelled) setMessages(res.data);
        await readFn(conversation.id);
        socket.markRead(conversation.id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per conversation
  }, [conversation.id]);

  useEffect(() => {
    socket.joinConversation(conversation.id);
    return () => socket.leaveConversation(conversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, socket.connected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

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
    const clientMessageId = newClientId();
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
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    socket.setTyping(conversation.id, false);

    try {
      if (socket.connected) {
        socket.sendMessage({ conversationId: conversation.id, body: text, clientMessageId });
      } else {
        const saved = await sendFn(conversation.id, { body: text, clientMessageId });
        mergeMessage(saved);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const onAttach = async (file: File | null) => {
    if (!file || closed) return;
    setSending(true);
    setError(null);
    try {
      const asset = await uploadSupportAttachment(file);
      const clientMessageId = newClientId();
      const payload = {
        clientMessageId,
        mediaAssetId: asset.id,
        originalFilename: file.name,
        body: draft.trim() || undefined,
      };
      if (socket.connected && !adminSend) {
        socket.sendMessage({ conversationId: conversation.id, ...payload });
      } else {
        mergeMessage(await sendFn(conversation.id, payload));
      }
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Attachment failed');
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Say hello — an admin will reply soon.</p>
        ) : (
          messages.map((m) => {
            const mine =
              (mode === 'admin' && m.senderType === 'ADMIN') ||
              (mode !== 'admin' && (m.senderType === 'USER' || m.senderType === 'GUEST'));
            return (
              <div
                key={m.id}
                className={cn('flex', mine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                    mine
                      ? 'bg-[var(--accent)] text-[var(--accent-fg,#fff)]'
                      : 'bg-[var(--bg-muted)] text-[var(--ink)]',
                  )}
                >
                  {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                  {m.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.downloadUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        'mt-1 block text-xs underline underline-offset-2',
                        mine ? 'opacity-90' : 'text-[var(--accent)]',
                      )}
                    >
                      {a.originalFilename}
                    </a>
                  ))}
                  <p
                    className={cn(
                      'mt-1 text-[10px]',
                      mine ? 'opacity-70' : 'text-[var(--muted)]',
                    )}
                  >
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {typing ? (
          <p className="text-xs text-[var(--muted)]">
            {mode === 'admin' ? 'Visitor is typing…' : 'Support is typing…'}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-red-600">{error}</p>
      ) : null}

      <form
        onSubmit={submit}
        className="flex items-end gap-2 border-t border-[var(--line)] px-3 py-3"
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
          className="mb-0.5 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] disabled:opacity-40"
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
          className="min-h-[2.5rem] max-h-28 flex-1 resize-none"
        />
        <Button type="submit" size="icon" disabled={closed || sending || !draft.trim()} aria-label="Send">
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
