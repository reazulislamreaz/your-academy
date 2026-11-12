'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SupportChatWindow } from '@/features/support/support-chat-window';
import { useMe } from '@/features/auth/use-auth';
import {
  createSupportNote,
  getAdminSupportConversation,
  listAdminSupportConversations,
  listAdminSupportMessages,
  listSupportNotes,
  markAdminSupportRead,
  sendAdminSupportMessage,
  updateAdminSupportConversation,
  type SupportConversation,
} from '@/lib/api/support';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = ['', 'OPEN', 'PENDING', 'CLOSED', 'ARCHIVED'] as const;

export default function AdminSupportPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [mobilePane, setMobilePane] = useState<'list' | 'thread' | 'details'>('list');

  const listQ = useQuery({
    queryKey: ['admin-support', q, status],
    queryFn: () => listAdminSupportConversations({ q: q || undefined, status: status || undefined }),
    refetchInterval: 15_000,
  });

  const items = listQ.data?.data ?? [];

  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [items, selectedId]);

  const detailQ = useQuery({
    queryKey: ['admin-support', selectedId],
    queryFn: () => getAdminSupportConversation(selectedId!),
    enabled: Boolean(selectedId),
  });

  const notesQ = useQuery({
    queryKey: ['admin-support-notes', selectedId],
    queryFn: () => listSupportNotes(selectedId!),
    enabled: Boolean(selectedId),
  });

  const conversation = detailQ.data;

  const patch = useMutation({
    mutationFn: (body: { status?: string; assignedAdminId?: string | null }) =>
      updateAdminSupportConversation(selectedId!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-support'] });
    },
  });

  const addNote = useMutation({
    mutationFn: () => createSupportNote(selectedId!, noteDraft),
    onSuccess: () => {
      setNoteDraft('');
      void qc.invalidateQueries({ queryKey: ['admin-support-notes', selectedId] });
    },
  });

  const selectedSummary = useMemo(
    () => items.find((c) => c.id === selectedId) ?? conversation ?? null,
    [items, selectedId, conversation],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Support inbox"
        description="Live conversations from learners and guests (DEC-029)."
      />

      {listQ.isError ? (
        <Alert variant="danger">Failed to load conversations.</Alert>
      ) : null}

      <div className="flex gap-2 lg:hidden">
        {(['list', 'thread', 'details'] as const).map((pane) => (
          <Button
            key={pane}
            type="button"
            size="sm"
            variant={mobilePane === pane ? 'primary' : 'outline'}
            onClick={() => setMobilePane(pane)}
          >
            {pane === 'list' ? 'Inbox' : pane === 'thread' ? 'Chat' : 'Details'}
          </Button>
        ))}
      </div>

      <div className="grid min-h-[70vh] gap-3 lg:grid-cols-[20rem_minmax(0,1fr)_18rem]">
        {/* List */}
        <aside
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]',
            mobilePane !== 'list' && 'hidden lg:flex',
          )}
        >
          <div className="space-y-2 border-b border-[var(--line)] p-3">
            <Input
              placeholder="Search name, WhatsApp, id…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    status === s
                      ? 'bg-[var(--accent)] text-[var(--accent-fg,#fff)]'
                      : 'bg-[var(--bg-muted)] text-[var(--ink-soft)]',
                  )}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {items.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                onSelect={() => {
                  setSelectedId(c.id);
                  setMobilePane('thread');
                }}
              />
            ))}
            {items.length === 0 && !listQ.isLoading ? (
              <li className="p-4 text-sm text-[var(--muted)]">No conversations yet.</li>
            ) : null}
          </ul>
        </aside>

        {/* Thread */}
        <section
          className={cn(
            'min-h-[28rem] overflow-hidden',
            mobilePane !== 'thread' && 'hidden lg:block',
          )}
        >
          {conversation ? (
            <SupportChatWindow
              key={conversation.id}
              conversation={conversation}
              mode="admin"
              className="h-full min-h-[28rem]"
              adminList={listAdminSupportMessages}
              adminSend={sendAdminSupportMessage}
              adminMarkRead={markAdminSupportRead}
            />
          ) : (
            <div className="flex h-full min-h-[28rem] items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">
              Select a conversation
            </div>
          )}
        </section>

        {/* Details */}
        <aside
          className={cn(
            'flex min-h-0 flex-col gap-3 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4',
            mobilePane !== 'details' && 'hidden lg:flex',
          )}
        >
          {selectedSummary ? (
            <>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {selectedSummary.participantName ?? 'Unknown'}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {selectedSummary.guestWhatsapp ??
                    (selectedSummary.userId ? `User ${selectedSummary.userId.slice(0, 8)}…` : '—')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge>{selectedSummary.status}</Badge>
                  {selectedSummary.guestSessionId ? (
                    <Badge variant="outline">Guest</Badge>
                  ) : (
                    <Badge variant="outline">Learner</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-1">
                  {(['OPEN', 'PENDING', 'CLOSED', 'ARCHIVED'] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={selectedSummary.status === s ? 'primary' : 'outline'}
                      disabled={patch.isPending}
                      onClick={() => patch.mutate({ status: s })}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assignment</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={patch.isPending || !me.data?.id}
                  onClick={() =>
                    patch.mutate({
                      assignedAdminId:
                        selectedSummary.assignedAdminId === me.data?.id ? null : me.data!.id,
                    })
                  }
                >
                  {selectedSummary.assignedAdminId === me.data?.id
                    ? 'Unassign me'
                    : 'Assign to me'}
                </Button>
              </div>

              <div className="space-y-2 border-t border-[var(--line)] pt-3">
                <Label>Internal notes</Label>
                <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                  {(notesQ.data ?? []).map((n) => (
                    <li key={n.id} className="rounded-lg bg-[var(--bg-muted)] px-2.5 py-2">
                      <p className="font-medium text-[var(--ink)]">{n.authorName}</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-[var(--ink-soft)]">{n.body}</p>
                      <p className="mt-1 text-[var(--muted)]">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
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
                  placeholder="Add a private note…"
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
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">No conversation selected.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: SupportConversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full border-b border-[var(--line)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-muted)]',
          active && 'bg-[var(--bg-muted)]',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">
            {conversation.participantName ?? 'Visitor'}
          </p>
          {conversation.adminUnreadCount > 0 ? (
            <span className="rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--accent-fg,#fff)]">
              {conversation.adminUnreadCount}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
          {conversation.lastMessagePreview ?? 'No messages yet'}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
          {conversation.status}
          {conversation.lastMessageAt
            ? ` · ${new Date(conversation.lastMessageAt).toLocaleString()}`
            : ''}
        </p>
      </button>
    </li>
  );
}
