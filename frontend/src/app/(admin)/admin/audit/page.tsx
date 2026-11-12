'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Surface } from '@/components/ui/surface';
import { ContentIn } from '@/components/ui/skeleton';
import { AdminAuditTableSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
};

export default function AdminAuditPage() {
  const list = useCursorList<AuditRow>(['admin-audit'], (cursor) => {
    const qs = new URLSearchParams({ limit: '40' });
    if (cursor) qs.set('cursor', cursor);
    return `/admin/audit?${qs}`;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        description="Admin and system actions recorded for review. Not a learner activity feed."
      />

      {list.isLoading ? <AdminAuditTableSkeleton rows={10} /> : null}
      {list.error ? <Alert variant="danger">Could not load audit log.</Alert> : null}

      {!list.isLoading && list.data ? (
        <ContentIn>
          <Surface className="overflow-hidden p-0">
            <div className="min-w-0 w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="bg-[var(--bg-desk)] text-xs font-semibold tracking-[0.08em] text-[var(--muted-strong)] uppercase">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {list.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[var(--muted-strong)]">
                        No audit entries yet.
                      </td>
                    </tr>
                  ) : (
                    list.items.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-xs text-[var(--muted-strong)] whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{row.action}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted-strong)]">
                          {row.entityType}
                          {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.actor ? row.actor.name : 'System'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Surface>
          <LoadMoreButton
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </ContentIn>
      ) : null}
    </div>
  );
}
