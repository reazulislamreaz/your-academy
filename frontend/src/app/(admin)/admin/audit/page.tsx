'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AdminMobileCard, AdminMobileCards } from '@/components/admin/admin-mobile-cards';
import { AdminListMeta, AdminPage, AdminToolbar } from '@/components/admin/admin-page';
import {
  AdminEmptyRow,
  AdminTable,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-table';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { ContentIn } from '@/components/ui/skeleton';
import { AdminAuditTableSkeleton } from '@/components/skeletons';
import { CopyIdButton } from '@/features/admin/activity/user-lookup';
import { LogCleanupPanel } from '@/features/admin/audit/log-cleanup-panel';
import { apiFetch } from '@/lib/api/client';
import type { AuditRow } from '@/lib/api/admin-activity-types';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const SCOPES = [
  { key: '', label: 'All logs' },
  { key: 'staff', label: 'Staff & admin actions' },
  { key: 'user', label: 'User actions' },
] as const;

const SEVERITY_VARIANT = {
  INFO: 'outline',
  WARNING: 'warning',
  CRITICAL: 'danger',
} as const;

function actorLabel(row: AuditRow) {
  if (row.actor) return row.actor.name;
  return row.actorRole === 'SYSTEM' ? 'System' : 'Anonymous';
}

/** DEC-067 — staff + user audit trail with filters, details and log cleanup (Admin only). */
export default function AdminAuditPage() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]['key']>('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const [action, setAction] = useState('');
  const [severity, setSeverity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const actions = useQuery({
    queryKey: ['admin-audit-actions'],
    queryFn: () => apiFetch<Array<{ action: string; count: number }>>('/admin/audit/actions'),
    staleTime: 60_000,
  });

  const list = useCursorList<AuditRow>(
    ['admin-audit', scope, debouncedQ, action, severity, from, to],
    (cursor) => {
      const qs = new URLSearchParams({ limit: '40' });
      if (scope) qs.set('scope', scope);
      if (debouncedQ) qs.set('q', debouncedQ);
      if (action) qs.set('action', action);
      if (severity) qs.set('severity', severity);
      if (from) qs.set('from', new Date(`${from}T00:00:00`).toISOString());
      if (to) qs.set('to', new Date(`${to}T23:59:59.999`).toISOString());
      if (cursor) qs.set('cursor', cursor);
      return `/admin/audit?${qs}`;
    },
  );

  const hasFilters = Boolean(debouncedQ || action || severity || from || to);
  const metadataText = useMemo(
    () => (selected ? JSON.stringify(selected.metadata ?? {}, null, 2) : ''),
    [selected],
  );

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        description="Staff changes (uploads, edits, CMS, overrides, deletions) and important user actions (sign-ups, sign-ins, failed sign-ins, password and plan changes)."
      />

      <div
        role="tablist"
        aria-label="Log scope"
        className="flex flex-wrap gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-muted)] p-1"
      >
        {SCOPES.map((s) => (
          <button
            key={s.key || 'all'}
            type="button"
            role="tab"
            aria-selected={scope === s.key}
            onClick={() => setScope(s.key)}
            className={cn(
              'min-h-9 flex-1 rounded-full px-3 text-sm font-semibold transition-colors sm:flex-none',
              scope === s.key
                ? 'bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--muted-strong)] hover:text-[var(--ink)]',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <AdminToolbar>
        <div className="admin-filter-grid">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Actor name, WhatsApp or User ID"
            aria-label="Search by actor name or User ID"
          />
          <Select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-10"
            aria-label="Action"
          >
            <option value="">All actions</option>
            {(actions.data ?? []).map((a) => (
              <option key={a.action} value={a.action}>
                {a.action} ({a.count})
              </option>
            ))}
          </Select>
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-10"
            aria-label="Severity"
          >
            <option value="">All severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10"
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10"
            aria-label="To date"
          />
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ('');
                setAction('');
                setSeverity('');
                setFrom('');
                setTo('');
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </AdminToolbar>

      {list.isLoading ? <AdminAuditTableSkeleton rows={10} /> : null}
      {list.error ? <Alert variant="danger">Could not load audit log.</Alert> : null}

      {!list.isLoading && list.data ? (
        <ContentIn>
          <AdminListMeta
            count={list.items.length}
            noun="entry"
            hasMore={list.hasNextPage}
            className="mb-3 md:hidden"
          />
          <AdminMobileCards>
            {list.items.length === 0 ? (
              <p className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-6 text-center text-sm text-[var(--muted-strong)]">
                {hasFilters ? 'No entries match these filters.' : 'No audit entries yet.'}
              </p>
            ) : (
              list.items.map((row) => (
                <AdminMobileCard
                  key={`m-${row.id}`}
                  badges={
                    <>
                      <Badge variant={SEVERITY_VARIANT[row.severity]}>{row.severity}</Badge>
                      <Badge variant="outline">{row.action}</Badge>
                    </>
                  }
                  title={`${actorLabel(row)}${row.actorRole ? ` · ${row.actorRole}` : ''}`}
                  meta={
                    <>
                      {row.entityType}
                      {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                      <br />
                      {new Date(row.createdAt).toLocaleString()}
                      {row.ipAddress ? ` · ${row.ipAddress}` : ''}
                    </>
                  }
                  actions={
                    <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
                      Details
                    </Button>
                  }
                />
              ))
            )}
            {list.hasNextPage ? (
              <LoadMoreButton
                hasNextPage={list.hasNextPage}
                isFetchingNextPage={list.isFetchingNextPage}
                onLoadMore={() => void list.fetchNextPage()}
                className="flex justify-center pt-1"
              />
            ) : null}
          </AdminMobileCards>
          <AdminTableShell
            desktopOnly
            minWidth="56rem"
            header={
              <AdminListMeta count={list.items.length} noun="entry" hasMore={list.hasNextPage} />
            }
            footer={
              list.hasNextPage ? (
                <LoadMoreButton
                  hasNextPage={list.hasNextPage}
                  isFetchingNextPage={list.isFetchingNextPage}
                  onLoadMore={() => void list.fetchNextPage()}
                  className="flex justify-center"
                />
              ) : undefined
            }
          >
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>When</AdminTh>
                  <AdminTh>Severity</AdminTh>
                  <AdminTh>Actor</AdminTh>
                  <AdminTh>Action</AdminTh>
                  <AdminTh>Target</AdminTh>
                  <AdminTh>IP</AdminTh>
                  <AdminTh align="right">Details</AdminTh>
                </tr>
              </thead>
              <tbody>
                {list.items.length === 0 ? (
                  <AdminEmptyRow colSpan={7}>
                    {hasFilters ? 'No entries match these filters.' : 'No audit entries yet.'}
                  </AdminEmptyRow>
                ) : (
                  list.items.map((row) => (
                    <tr key={row.id}>
                      <AdminTd muted className="text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </AdminTd>
                      <AdminTd>
                        <Badge variant={SEVERITY_VARIANT[row.severity]}>{row.severity}</Badge>
                      </AdminTd>
                      <AdminTd>
                        <p className="font-medium text-[var(--ink)]">{actorLabel(row)}</p>
                        {row.actorRole ? (
                          <p className="text-xs text-[var(--muted-strong)]">{row.actorRole}</p>
                        ) : null}
                      </AdminTd>
                      <AdminTd>
                        <Badge variant="outline">{row.action}</Badge>
                      </AdminTd>
                      <AdminTd muted className="max-w-[16rem] text-xs break-words">
                        {row.entityType}
                        {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                      </AdminTd>
                      <AdminTd muted className="text-xs">
                        {row.ipAddress ?? '—'}
                      </AdminTd>
                      <AdminTd align="right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
                          View
                        </Button>
                      </AdminTd>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </AdminTableShell>
        </ContentIn>
      ) : null}

      <LogCleanupPanel />

      <FormDialog
        open={selected !== null}
        title={selected ? selected.action : ''}
        description={selected ? new Date(selected.createdAt).toLocaleString() : undefined}
        confirmLabel="Close"
        cancelLabel="Close"
        error={null}
        onSubmit={() => setSelected(null)}
        onClose={() => setSelected(null)}
        className="sm:max-w-2xl"
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--muted)]">Actor</dt>
                <dd className="text-[var(--ink)]">
                  {actorLabel(selected)}
                  {selected.actorRole ? ` · ${selected.actorRole}` : ''}
                </dd>
                {selected.actor ? <CopyIdButton id={selected.actor.id} /> : null}
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Severity</dt>
                <dd>
                  <Badge variant={SEVERITY_VARIANT[selected.severity]}>{selected.severity}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">Target</dt>
                <dd className="break-words text-[var(--ink)]">{selected.entityType}</dd>
                {selected.entityId ? <CopyIdButton id={selected.entityId} /> : null}
              </div>
              <div>
                <dt className="text-xs text-[var(--muted)]">IP address</dt>
                <dd className="text-[var(--ink)]">{selected.ipAddress ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--muted)]">Device / user agent</dt>
                <dd className="break-words text-[var(--ink)]">{selected.userAgent ?? '—'}</dd>
              </div>
            </dl>
            <div>
              <p className="mb-1 text-xs text-[var(--muted)]">Metadata / change summary</p>
              <pre className="max-h-72 overflow-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)] p-3 text-xs leading-relaxed text-[var(--ink)]">
                {metadataText}
              </pre>
            </div>
          </div>
        ) : null}
      </FormDialog>
    </AdminPage>
  );
}
