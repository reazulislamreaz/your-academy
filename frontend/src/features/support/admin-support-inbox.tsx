'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  Info,
  Loader2,
  MessageCircle,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  SendHorizontal,
  Smile,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type UIEvent,
} from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Textarea } from '@/components/ui/textarea';
import { useMe } from '@/features/auth/use-auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  createSupportNote,
  getAdminSupportConversation,
  listAdminSupportConversations,
  listAdminSupportMessages,
  listSupportNotes,
  markAdminSupportRead,
  sendAdminSupportMessage,
  updateAdminSupportConversation,
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
  formatConversationListTime,
  formatDayLabel,
  formatMessageTime,
  mergeSupportMessage,
  NEAR_BOTTOM_PX,
  newSupportClientId,
  prependOlderMessages,
  sortMessagesChronological,
} from './support-message-utils';
import { useSupportSocket } from './support-socket';

type InboxFilter = 'all' | 'unread' | 'active' | 'archived';

const FILTERS: Array<{ id: InboxFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'active', label: 'Active' },
  { id: 'archived', label: 'Archived' },
];

const EMOJIS = ['😀', '👍', '🙏', '✅', '🔥', '😊', '🎉', '📎', '💡', '❤️'];

function initials(name: string | null | undefined) {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function presenceLabel(c: SupportConversation) {
  if (c.participantOnline) return 'Online';
  if (c.participantLastSeenAt) {
    return `Last seen ${formatConversationListTime(c.participantLastSeenAt)}`;
  }
  return c.guestSessionId ? 'Guest' : 'Offline';
}

export function AdminSupportInbox() {
  const me = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyQuote, setReplyQuote] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const preserveScroll = useRef<{ height: number; top: number } | null>(null);
  const socketActionsRef = useRef<{
    joinConversation: (id: string) => void;
    markRead: (id: string) => void;
  } | null>(null);

  const listQ = useQuery({
    queryKey: ['admin-support', debouncedQ, filter],
    queryFn: () =>
      listAdminSupportConversations({
        q: debouncedQ || undefined,
        filter,
      }),
    refetchInterval: 20_000,
  });

  const items = listQ.data?.data ?? [];

  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [items, selectedId]);

  const detailQ = useQuery({
    queryKey: ['admin-support-detail', selectedId],
    queryFn: () => getAdminSupportConversation(selectedId!),
    enabled: Boolean(selectedId),
  });

  const notesQ = useQuery({
    queryKey: ['admin-support-notes', selectedId],
    queryFn: () => listSupportNotes(selectedId!),
    enabled: Boolean(selectedId),
  });

  const conversation = detailQ.data ?? items.find((c) => c.id === selectedId) ?? null;

  const mergeMessage = useCallback((incoming: SupportMessage) => {
    setMessages((prev) => mergeSupportMessage(prev, incoming));
    if (stickToBottom.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string, cursor?: string) => {
    const res = await listAdminSupportMessages(conversationId, cursor);
    if (cursor) {
      setMessages((prev) => prependOlderMessages(prev, res.data));
    } else {
      setMessages(sortMessagesChronological(res.data));
    }
    setNextCursor(res.pagination?.nextCursor ?? null);
  }, []);

  const socket = useSupportSocket(true, {
    onMessageNew: (m) => {
      if (m.conversationId === selectedId) {
        mergeMessage(m);
        void markAdminSupportRead(m.conversationId);
        socketActionsRef.current?.markRead(m.conversationId);
      }
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
    },
    onMessageAck: ({ message }) => {
      if (message.conversationId === selectedId) mergeMessage(message);
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
    },
    onTyping: (p) => {
      if (p.conversationId !== selectedId) return;
      if (p.actorKind === 'admin') return;
      setTyping(p.typing);
    },
    onConversationUpdated: () => {
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
    },
    onUnread: () => {
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
    },
    onReconnect: () => {
      if (!selectedId) return;
      socketActionsRef.current?.joinConversation(selectedId);
      void loadMessages(selectedId).catch(() => undefined);
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
    },
  });
  socketActionsRef.current = {
    joinConversation: socket.joinConversation,
    markRead: socket.markRead,
  };

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    stickToBottom.current = true;
    (async () => {
      try {
        await loadMessages(selectedId);
        if (cancelled) return;
        await markAdminSupportRead(selectedId);
        socket.markRead(selectedId);
        socket.joinConversation(selectedId);
        void qc.invalidateQueries({ queryKey: ['admin-support'] });
        requestAnimationFrame(() =>
          bottomRef.current?.scrollIntoView({ behavior: 'auto' }),
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load thread');
      }
    })();
    return () => {
      cancelled = true;
      socket.leaveConversation(selectedId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, socket.connected, loadMessages]);

  useEffect(() => {
    const el = threadScrollRef.current;
    const saved = preserveScroll.current;
    if (!el || !saved) return;
    el.scrollTop = saved.top + (el.scrollHeight - saved.height);
    preserveScroll.current = null;
  }, [messages]);

  const onThreadScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < NEAR_BOTTOM_PX;
  };

  const patch = useMutation({
    mutationFn: (body: { status?: string; assignedAdminId?: string | null }) =>
      updateAdminSupportConversation(selectedId!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
      void qc.invalidateQueries({ queryKey: ['admin-support-detail', selectedId] });
    },
  });

  const addNote = useMutation({
    mutationFn: () => createSupportNote(selectedId!, noteDraft),
    onSuccess: () => {
      setNoteDraft('');
      void qc.invalidateQueries({ queryKey: ['admin-support-notes', selectedId] });
    },
  });

  const closed =
    conversation?.status === 'CLOSED' || conversation?.status === 'ARCHIVED';

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (!selectedId) return;
    socket.setTyping(selectedId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.setTyping(selectedId, false), 1200);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!selectedId || sending || closed) return;
    const text = draft.trim();
    if (!text && !pendingFile) return;
    setSending(true);
    setError(null);
    const clientMessageId = newSupportClientId();
    const bodyText = replyQuote
      ? `↩️ ${replyQuote}\n\n${text}`.trim()
      : text || undefined;

    const pendingLocal = pendingFile;
    const pendingUrl = pendingPreviewUrl;
    stickToBottom.current = true;

    const optimistic: SupportMessage = {
      id: `tmp-${clientMessageId}`,
      conversationId: selectedId,
      senderType: 'ADMIN',
      senderUserId: me.data?.id ?? null,
      clientMessageId,
      kind: pendingLocal ? 'ATTACHMENT' : 'TEXT',
      body: bodyText ?? null,
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
      attachments:
        pendingLocal && pendingUrl
          ? [
              {
                id: `tmp-att-${clientMessageId}`,
                mediaAssetId: 'pending',
                originalFilename: pendingLocal.name,
                mimeType: pendingLocal.type || 'application/octet-stream',
                bytes: pendingLocal.size,
                downloadUrl: pendingUrl,
              },
            ]
          : [],
    };
    if (bodyText || pendingLocal) {
      mergeMessage(optimistic);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
      );
    }

    try {
      let mediaAssetId: string | undefined;
      let originalFilename: string | undefined;
      if (pendingLocal) {
        const asset = await uploadSupportAttachment(pendingLocal);
        mediaAssetId = asset.id;
        originalFilename = pendingLocal.name;
      }
      const payload = {
        clientMessageId,
        body: bodyText,
        mediaAssetId,
        originalFilename,
      };
      if (socket.connected) {
        socket.sendMessage({ conversationId: selectedId, ...payload });
      } else {
        mergeMessage(await sendAdminSupportMessage(selectedId, payload));
      }
      setDraft('');
      setReplyQuote(null);
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
      setPendingFile(null);
      setPendingPreviewUrl(null);
      socket.setTyping(selectedId, false);
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onPickFile = (file: File | null) => {
    if (!file) return;
    setPendingFile(file);
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const loadOlder = async () => {
    if (!selectedId || !nextCursor || loadingOlder) return;
    const el = threadScrollRef.current;
    if (el) preserveScroll.current = { height: el.scrollHeight, top: el.scrollTop };
    stickToBottom.current = false;
    setLoadingOlder(true);
    try {
      await loadMessages(selectedId, nextCursor);
    } catch {
      preserveScroll.current = null;
    } finally {
      setLoadingOlder(false);
    }
  };

  const messageGroups = useMemo(() => {
    const groups: Array<{ day: string; items: SupportMessage[] }> = [];
    for (const m of messages) {
      const day = formatDayLabel(m.createdAt);
      const last = groups[groups.length - 1];
      if (!last || last.day !== day) groups.push({ day, items: [m] });
      else last.items.push(m);
    }
    return groups;
  }, [messages]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    setMobilePane('thread');
    setReplyQuote(null);
    setError(null);
  };

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[var(--bg-desk)]">
      {/* Conversation list */}
      <aside
        className={cn(
          'flex w-full min-w-0 flex-col border-r border-[var(--line)] bg-[var(--bg-elevated)] md:w-[22rem] lg:w-[24rem]',
          mobilePane !== 'list' && 'hidden md:flex',
        )}
      >
        <div className="space-y-3 border-b border-[var(--line)] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Support
              </p>
              <h1 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                Messages
              </h1>
            </div>
            <Badge variant="info">{items.filter((c) => c.adminUnreadCount > 0).length} unread</Badge>
          </div>
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Search name, WhatsApp…"
            aria-label="Search conversations"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-2 text-xs font-semibold transition-colors',
                  filter === f.id
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'bg-[var(--bg-muted)] text-[var(--muted-strong)] hover:bg-[var(--brand-wash)]',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
          {listQ.isError ? (
            <div className="p-4">
              <Alert variant="danger">Failed to load conversations.</Alert>
            </div>
          ) : null}
          {listQ.isLoading ? (
            <p className="p-4 text-sm text-[var(--muted)]">Loading inbox…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <MessageCircle className="size-10 text-[var(--muted)] opacity-50" />
              <p className="text-sm font-medium text-[var(--ink)]">No conversations</p>
              <p className="text-xs text-[var(--muted)]">
                Guest and learner chats will appear here.
              </p>
            </div>
          ) : (
            <ul>
              {items.map((c) => {
                const active = c.id === selectedId;
                const unread = c.adminUnreadCount > 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      className={cn(
                        'flex w-full gap-3 border-b border-[var(--line)] px-4 py-3 text-left transition-colors',
                        active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-muted)]',
                        unread && !active && 'bg-[var(--brand-wash)]',
                      )}
                    >
                      <span className="relative shrink-0">
                        <span className="flex size-11 items-center justify-center rounded-full bg-[var(--bg-muted)] text-sm font-semibold text-[var(--ink-soft)]">
                          {c.participantAvatarUrl ? (
                            <img
                              src={c.participantAvatarUrl}
                              alt=""
                              className="size-11 rounded-full object-cover"
                            />
                          ) : (
                            initials(c.participantName)
                          )}
                        </span>
                        <span
                          className={cn(
                            'absolute right-0 bottom-0 size-3 rounded-full ring-2 ring-[var(--bg-elevated)]',
                            c.participantOnline ? 'bg-[var(--success)]' : 'bg-[var(--muted)]',
                          )}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-sm',
                              unread ? 'font-bold text-[var(--ink)]' : 'font-semibold text-[var(--ink)]',
                            )}
                          >
                            {c.participantName ?? 'Visitor'}
                          </span>
                          <span className="shrink-0 text-[10px] tabular-nums text-[var(--muted)]">
                            {formatConversationListTime(c.lastMessageAt)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate text-xs',
                              unread ? 'font-medium text-[var(--ink-soft)]' : 'text-[var(--muted)]',
                            )}
                          >
                            {c.lastMessagePreview ?? 'No messages yet'}
                          </span>
                          {unread ? (
                            <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--accent-fg)]">
                              {c.adminUnreadCount > 99 ? '99+' : c.adminUnreadCount}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Thread */}
      <section
        className={cn(
          'flex min-w-0 flex-1 flex-col bg-[var(--bg-soft)]',
          mobilePane !== 'thread' && 'hidden md:flex',
        )}
      >
        {!conversation ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <MessageCircle className="size-12 text-[var(--muted)] opacity-40" />
            <p className="text-sm font-medium text-[var(--ink)]">Select a conversation</p>
            <p className="text-xs text-[var(--muted)]">
              Choose a chat from the left to reply in real time.
            </p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 sm:px-4">
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-muted)] md:hidden"
                aria-label="Back to inbox"
                onClick={() => setMobilePane('list')}
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="relative shrink-0">
                <span className="flex size-10 items-center justify-center rounded-full bg-[var(--bg-muted)] text-sm font-semibold">
                  {initials(conversation.participantName)}
                </span>
                <span
                  className={cn(
                    'absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-[var(--bg-elevated)]',
                    conversation.participantOnline ? 'bg-[var(--success)]' : 'bg-[var(--muted)]',
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {conversation.participantName ?? 'Visitor'}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {typing ? 'typing…' : presenceLabel(conversation)}
                </p>
              </div>
              <button
                type="button"
                className="hidden rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-muted)] lg:inline-flex"
                aria-label={detailsOpen ? 'Hide details' : 'Show details'}
                onClick={() => setDetailsOpen((v) => !v)}
              >
                {detailsOpen ? <PanelRightClose className="size-5" /> : <PanelRightOpen className="size-5" />}
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-muted)] lg:hidden"
                aria-label="Details"
                onClick={() => setDetailsOpen((v) => !v)}
              >
                <Info className="size-5" />
              </button>
            </header>

            <div
              ref={threadScrollRef}
              onScroll={onThreadScroll}
              className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--line) 45%, transparent) 1px, transparent 0)',
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

              {messages.length === 0 ? (
                <div className="flex min-h-[12rem] flex-col items-center justify-center gap-1 text-center">
                  <p className="text-sm font-medium text-[var(--ink)]">No messages yet</p>
                  <p className="text-xs text-[var(--muted)]">Send the first reply to start the thread.</p>
                </div>
              ) : null}

              {messageGroups.map((group) => (
                <div key={group.day} className="mb-4 space-y-1.5">
                  <div className="sticky top-1 z-[1] flex justify-center py-1">
                    <span className="rounded-full bg-[var(--bg-elevated)]/95 px-3 py-1 text-[11px] font-medium text-[var(--muted)] shadow-sm ring-1 ring-[var(--line)]">
                      {group.day}
                    </span>
                  </div>
                  {group.items.map((m) => {
                    const mine = m.senderType === 'ADMIN';
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
                            'group max-w-[min(28rem,85%)] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm',
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
                          <div
                            className={cn(
                              'mt-1 flex items-center justify-end gap-1.5',
                              mine ? 'text-white/70' : 'text-[var(--muted)]',
                            )}
                          >
                            <button
                              type="button"
                              className={cn(
                                'text-[10px] opacity-0 transition-opacity group-hover:opacity-100',
                                mine ? 'text-white/80' : 'text-[var(--muted)]',
                              )}
                              onClick={() =>
                                setReplyQuote(
                                  (m.body ?? m.attachments[0]?.originalFilename ?? '').slice(0, 120),
                                )
                              }
                            >
                              Reply
                            </button>
                            <span className="text-[10px] tabular-nums">
                              {formatMessageTime(m.createdAt)}
                              {pending ? ' · sending' : ''}
                            </span>
                            {mine && !pending ? (
                              m.readAt ? (
                                <CheckCheck
                                  className="size-3.5 text-[var(--accent-fg,#fff)]"
                                  aria-label="Read"
                                />
                              ) : m.deliveredAt ? (
                                <CheckCheck className="size-3.5 opacity-70" aria-label="Delivered" />
                              ) : (
                                <Check className="size-3.5 opacity-70" aria-label="Sent" />
                              )
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
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
              <p className="border-t border-[var(--line)] bg-[var(--danger-soft)] px-4 py-2 text-xs text-[var(--danger-fg)]">
                {error}
              </p>
            ) : null}

            {replyQuote ? (
              <div className="flex items-start gap-2 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2 text-xs">
                <div className="min-w-0 flex-1 rounded-lg border-l-2 border-[var(--accent)] bg-[var(--bg-muted)] px-3 py-2 text-[var(--ink-soft)]">
                  {replyQuote}
                </div>
                <button
                  type="button"
                  className="text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => setReplyQuote(null)}
                >
                  Clear
                </button>
              </div>
            ) : null}

            {pendingFile ? (
              <SupportPendingAttachmentPreview
                file={pendingFile}
                previewUrl={pendingPreviewUrl}
                onClear={() => {
                  if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
                  setPendingFile(null);
                  setPendingPreviewUrl(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              />
            ) : null}

            <form
              onSubmit={submit}
              className="relative flex items-end gap-2 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-3"
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <div className="relative">
                <button
                  type="button"
                  disabled={closed || sending}
                  aria-label="Emoji"
                  onClick={() => setEmojiOpen((v) => !v)}
                  className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-muted)] disabled:opacity-40"
                >
                  <Smile className="size-5" />
                </button>
                {emojiOpen ? (
                  <div className="absolute bottom-12 left-0 z-20 grid grid-cols-5 gap-1 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-2 shadow-[var(--shadow)]">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className="rounded-md p-1.5 text-lg hover:bg-[var(--bg-muted)]"
                        onClick={() => {
                          setDraft((d) => d + e);
                          setEmojiOpen(false);
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={closed || sending}
                aria-label="Attach"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--bg-muted)] disabled:opacity-40"
              >
                <Paperclip className="size-5" />
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
                placeholder={closed ? 'Conversation closed' : 'Type a message'}
                disabled={closed || sending}
                rows={1}
                className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send"
                disabled={closed || sending || (!draft.trim() && !pendingFile)}
                className="mb-0.5 size-10 shrink-0 rounded-full"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizontal className="size-4" />
                )}
              </Button>
            </form>
          </>
        )}
      </section>

      {/* Details panel */}
      {conversation && detailsOpen ? (
        <aside
          className={cn(
            'flex w-full max-w-sm flex-col border-l border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]',
            'absolute inset-y-0 right-0 z-20 lg:static lg:w-[18rem] lg:max-w-none lg:shadow-none',
            mobilePane === 'list' && 'hidden',
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--ink)]">Details</p>
            <button
              type="button"
              className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--bg-muted)]"
              onClick={() => setDetailsOpen(false)}
              aria-label="Close details"
            >
              <PanelRightClose className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--bg-muted)] text-lg font-semibold">
                {initials(conversation.participantName)}
              </span>
              <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
                {conversation.participantName ?? 'Visitor'}
              </p>
              <p className="text-xs text-[var(--muted)]">{presenceLabel(conversation)}</p>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="font-semibold text-[var(--muted)] uppercase tracking-wide">Contact</p>
              <p className="text-[var(--ink-soft)]">
                {conversation.guestWhatsapp ??
                  (conversation.userId ? `User ${conversation.userId.slice(0, 8)}…` : '—')}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                <Badge>{conversation.status}</Badge>
                {conversation.guestSessionId ? (
                  <Badge variant="outline">Guest</Badge>
                ) : (
                  <Badge variant="outline">Learner</Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Status</Label>
              <div className="flex flex-wrap gap-1">
                {(['OPEN', 'PENDING', 'CLOSED', 'ARCHIVED'] as const).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={conversation.status === s ? 'primary' : 'outline'}
                    disabled={patch.isPending}
                    onClick={() => patch.mutate({ status: s })}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Assignment</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={patch.isPending || !me.data?.id}
                onClick={() =>
                  patch.mutate({
                    assignedAdminId:
                      conversation.assignedAdminId === me.data?.id ? null : me.data!.id,
                  })
                }
              >
                {conversation.assignedAdminId === me.data?.id ? 'Unassign me' : 'Assign to me'}
              </Button>
            </div>

            <div className="space-y-2 border-t border-[var(--line)] pt-3">
              <Label className="text-xs">Internal notes</Label>
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {(notesQ.data ?? []).map((n) => (
                  <li key={n.id} className="rounded-lg bg-[var(--bg-muted)] px-2.5 py-2 text-xs">
                    <p className="font-medium text-[var(--ink)]">{n.authorName}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[var(--ink-soft)]">{n.body}</p>
                  </li>
                ))}
                {(notesQ.data ?? []).length === 0 ? (
                  <li className="text-[var(--muted)]">No notes yet.</li>
                ) : null}
              </ul>
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                placeholder="Private note…"
              />
              <Button
                type="button"
                size="sm"
                disabled={!noteDraft.trim() || addNote.isPending}
                onClick={() => addNote.mutate()}
              >
                Save note
              </Button>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
