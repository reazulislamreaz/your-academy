'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/ui/search-field';
import { apiFetch } from '@/lib/api/client';
import type { UserLookupResult } from '@/lib/api/admin-activity-types';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

/** One-click copy of a user ID (falls back silently where the clipboard is unavailable). */
export function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(id).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 font-mono text-xs text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:outline-none"
      aria-label={copied ? 'User ID copied' : `Copy user ID ${id}`}
      title={id}
    >
      <span className="break-all">{id}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
}

/**
 * DEC-067 — Name / email / WhatsApp ↔ User ID. A full UUID (or its first characters) finds the
 * profile; a name finds the ID. "Show activity" filters the event timeline to that user.
 */
export function UserLookup({
  activeUserId,
  onSelect,
}: {
  activeUserId: string;
  onSelect: (userId: string) => void;
}) {
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q.trim(), 300);
  const lookup = useQuery({
    queryKey: ['admin-user-lookup', debounced],
    queryFn: () =>
      apiFetch<UserLookupResult>(`/admin/activity/users/lookup?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
    staleTime: 15_000,
  });

  const items = lookup.data?.items ?? [];
  return (
    <div className="space-y-2">
      <SearchField
        value={q}
        onChange={setQ}
        placeholder="Find a user by name, email, WhatsApp or User ID…"
        aria-label="Look up a user by name or User ID"
      />
      {debounced.length >= 2 ? (
        lookup.isLoading ? (
          <p className="text-sm text-[var(--muted-strong)]">Searching…</p>
        ) : lookup.isError ? (
          <p className="text-sm text-[var(--danger-fg)]">Lookup failed. Try again.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted-strong)]">No user matches “{debounced}”.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)] rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
            {items.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
                    <Link href={`/admin/users/${u.id}`} className="hover:underline">
                      {u.name}
                    </Link>
                    <Badge variant="outline">{u.role}</Badge>
                    <Badge
                      variant={
                        u.plan === 'PAID' ? 'success' : u.plan === 'STAFF' ? 'info' : 'default'
                      }
                    >
                      {u.plan === 'PAID' ? 'Paid' : u.plan === 'STAFF' ? 'Staff' : 'Free'}
                    </Badge>
                    {u.status !== 'ACTIVE' ? <Badge variant="danger">{u.status}</Badge> : null}
                  </p>
                  <p className="text-xs text-[var(--muted-strong)]">
                    {[u.email, u.whatsappNumber].filter(Boolean).join(' · ')}
                    {u.lastActiveAt
                      ? ` · last active ${new Date(u.lastActiveAt).toLocaleString()}`
                      : ''}
                  </p>
                  <CopyIdButton id={u.id} />
                </div>
                <Button
                  size="sm"
                  variant={activeUserId === u.id ? 'primary' : 'outline'}
                  className="gap-1.5"
                  onClick={() => onSelect(activeUserId === u.id ? '' : u.id)}
                >
                  <Filter className="size-3.5" aria-hidden />
                  {activeUserId === u.id ? 'Showing activity' : 'Show activity'}
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
