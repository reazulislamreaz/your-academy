import type { SupportMessage } from '@/lib/api/support';

/** Stable chronological compare: createdAt ASC, then id ASC (tie-break). */
export function compareMessagesChronological(a: SupportMessage, b: SupportMessage): number {
  const ta = Date.parse(a.createdAt);
  const tb = Date.parse(b.createdAt);
  if (ta !== tb) return ta - tb;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

export function sortMessagesChronological(messages: SupportMessage[]): SupportMessage[] {
  return [...messages].sort(compareMessagesChronological);
}

/**
 * Insert or replace a message, keeping oldest→newest order.
 * Dedupes by id and by clientMessageId (optimistic → server ACK).
 */
export function mergeSupportMessage(
  prev: SupportMessage[],
  incoming: SupportMessage,
): SupportMessage[] {
  if (prev.some((m) => m.id === incoming.id)) {
    return prev.map((m) => (m.id === incoming.id ? { ...m, ...incoming } : m));
  }
  if (
    incoming.clientMessageId &&
    prev.some((m) => m.clientMessageId === incoming.clientMessageId)
  ) {
    return sortMessagesChronological(
      prev.map((m) =>
        m.clientMessageId === incoming.clientMessageId ? incoming : m,
      ),
    );
  }
  return sortMessagesChronological([...prev, incoming]);
}

/** Prepend older page while deduping; result stays chronological. */
export function prependOlderMessages(
  prev: SupportMessage[],
  older: SupportMessage[],
): SupportMessage[] {
  const ids = new Set(prev.map((m) => m.id));
  const fresh = older.filter((m) => !ids.has(m.id));
  if (fresh.length === 0) return prev;
  return sortMessagesChronological([...fresh, ...prev]);
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatConversationListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function newSupportClientId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Distance from bottom below this (px) counts as "near bottom" for auto-scroll. */
export const NEAR_BOTTOM_PX = 120;
