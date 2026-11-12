'use client';

import { AdminMobileCard, AdminMobileCards } from '@/components/admin/admin-mobile-cards';
import { AdminListMeta, AdminPage } from '@/components/admin/admin-page';
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
import { LoadMoreButton } from '@/components/ui/load-more-button';
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
    <AdminPage dense>
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        description="Admin and system actions recorded for review. Not a learner activity feed."
      />

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
                No audit entries yet.
              </p>
            ) : (
              list.items.map((row) => (
                <AdminMobileCard
                  key={`m-${row.id}`}
                  badges={<Badge variant="outline">{row.action}</Badge>}
                  title={row.actor ? row.actor.name : 'System'}
                  meta={
                    <>
                      {row.entityType}
                      {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                      <br />
                      {new Date(row.createdAt).toLocaleString()}
                    </>
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
            minWidth="40rem"
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
                  <AdminTh>Action</AdminTh>
                  <AdminTh>Entity</AdminTh>
                  <AdminTh>Actor</AdminTh>
                </tr>
              </thead>
              <tbody>
                {list.items.length === 0 ? (
                  <AdminEmptyRow colSpan={4}>No audit entries yet.</AdminEmptyRow>
                ) : (
                  list.items.map((row) => (
                    <tr key={row.id}>
                      <AdminTd muted className="text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </AdminTd>
                      <AdminTd>
                        <Badge variant="outline">{row.action}</Badge>
                      </AdminTd>
                      <AdminTd muted className="text-xs">
                        {row.entityType}
                        {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
                      </AdminTd>
                      <AdminTd>{row.actor ? row.actor.name : 'System'}</AdminTd>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </AdminTableShell>
        </ContentIn>
      ) : null}
    </AdminPage>
  );
}
