'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { AdminMobileCard, AdminMobileCards } from '@/components/admin/admin-mobile-cards';
import { AdminListMeta, AdminPage, AdminToolbar } from '@/components/admin/admin-page';
import { AdminRowActions } from '@/components/admin/admin-row-actions';
import { AdminUserStatus } from '@/components/admin/admin-status';
import { AdminEmptyRow, AdminTable, AdminTableShell, AdminTd, AdminTh } from '@/components/admin/admin-table';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Select } from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import type { AdminUserListItem } from '@/lib/api/admin-activity-types';
import { AdminUsersPageSkeleton, AdminUsersTableSkeleton } from '@/components/skeletons';
import { ContentIn } from '@/components/ui/skeleton';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { apiFetch } from '@/lib/api/client';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'SUSPENDED'>('');
  const [error, setError] = useState<string | null>(null);

  const list = useCursorList<AdminUserListItem>(
    ['admin-users', qApplied, status],
    (cursor) => {
      const params = new URLSearchParams({ limit: '30' });
      if (qApplied.trim()) params.set('q', qApplied.trim());
      if (status) params.set('status', status);
      if (cursor) params.set('cursor', cursor);
      return `/admin/users?${params}`;
    },
  );

  const updateStatus = useMutation({
    mutationFn: ({ id, status: next }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      apiFetch(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      void qc.invalidateQueries({ queryKey: ['admin-user'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    },
  });

  if (list.isLoading && !list.data) {
    return <AdminUsersPageSkeleton />;
  }

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Find learners by name, WhatsApp, or email. Suspend or reinstate accounts from the list or detail page."
      />

      <AdminToolbar>
        <form
          className="admin-filter-grid"
          onSubmit={(e) => {
            e.preventDefault();
            setQApplied(q.trim());
          }}
        >
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted-strong)]"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, WhatsApp, or email"
              className="h-10 pl-9"
              aria-label="Search users"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | 'ACTIVE' | 'SUSPENDED')}
            className="h-10 w-full sm:w-44"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
          <Button type="submit" variant="outline" className="h-10">
            Search
          </Button>
        </form>
      </AdminToolbar>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {list.isLoading ? <AdminUsersTableSkeleton /> : null}
      {list.error ? (
        <LoadError message="Could not load users." onRetry={() => void list.refetch()} />
      ) : null}

      {!list.isLoading && list.data ? (
        <ContentIn className="space-y-4">
          {list.items.length === 0 ? (
            <EmptyState
              title="No users found"
              description={
                qApplied || status
                  ? 'Try a different search or clear the status filter.'
                  : 'Registered learners will appear here.'
              }
            />
          ) : (
            <>
            <AdminListMeta
              className="md:hidden"
              count={list.items.length}
              noun="user"
              hasMore={list.hasNextPage}
              query={qApplied || undefined}
            />
            <AdminMobileCards>
              {list.items.map((user) => (
                <AdminMobileCard
                  key={`m-${user.id}`}
                  badges={
                    <>
                      <Badge variant="outline">{user.role}</Badge>
                      <AdminUserStatus status={user.status} />
                      {user.online ? <Badge variant="success">Online</Badge> : null}
                    </>
                  }
                  title={
                    <Link href={`/admin/users/${user.id}`} className="hover:underline">
                      {user.name}
                    </Link>
                  }
                  meta={
                    <>
                      {user.whatsappNumber}
                      {user.email ? ` · ${user.email}` : ''}
                      <br />
                      {user.subscription
                        ? user.subscription.plan.name
                        : user.trialActive
                          ? 'Trial active'
                          : 'Trial ended'}
                      {' · '}
                      {user.attemptCount} MCQ · {user.practiceAttemptCount} practice
                    </>
                  }
                  actions={
                    <>
                      <Link href={`/admin/users/${user.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      {user.role !== 'ADMIN' ? (
                        user.status === 'ACTIVE' ? (
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            confirmTitle="Suspend this user?"
                            confirmMessage={`Suspend ${user.name}? They will not be able to sign in until reinstated.`}
                            confirmLabel="Suspend"
                            reversible
                            onConfirm={() =>
                              updateStatus.mutateAsync({ id: user.id, status: 'SUSPENDED' })
                            }
                          >
                            Suspend
                          </ConfirmButton>
                        ) : (
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            confirmTitle="Reinstate this user?"
                            confirmMessage={`Reinstate ${user.name} and restore sign-in access?`}
                            confirmLabel="Reinstate"
                            destructive={false}
                            reversible
                            onConfirm={() =>
                              updateStatus.mutateAsync({ id: user.id, status: 'ACTIVE' })
                            }
                          >
                            Reinstate
                          </ConfirmButton>
                        )
                      ) : null}
                    </>
                  }
                />
              ))}
            </AdminMobileCards>
            <AdminTableShell
              desktopOnly
              minWidth="52rem"
              header={
                <AdminListMeta
                  count={list.items.length}
                  noun="user"
                  hasMore={list.hasNextPage}
                  query={qApplied || undefined}
                />
              }
              footer={
                <LoadMoreButton
                  hasNextPage={list.hasNextPage}
                  isFetchingNextPage={list.isFetchingNextPage}
                  onLoadMore={() => void list.fetchNextPage()}
                />
              }
            >
              <AdminTable>
                <thead>
                  <tr>
                    <AdminTh>User</AdminTh>
                    <AdminTh>Presence</AdminTh>
                    <AdminTh>Access</AdminTh>
                    <AdminTh>Study</AdminTh>
                    <AdminTh>Joined</AdminTh>
                    <AdminTh align="right">Actions</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {list.items.length === 0 ? (
                    <AdminEmptyRow colSpan={6}>No users match this search.</AdminEmptyRow>
                  ) : (
                    list.items.map((user) => (
                      <tr key={user.id}>
                        <AdminTd className="max-w-[16rem]">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="truncate font-semibold text-[var(--ink)] hover:underline"
                          >
                            {user.name}
                          </Link>
                          <p className="truncate text-xs text-[var(--muted-strong)]">
                            {user.whatsappNumber}
                            {user.email ? ` · ${user.email}` : ''}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <Badge variant="outline">{user.role}</Badge>
                            <AdminUserStatus status={user.status} />
                          </div>
                        </AdminTd>
                        <AdminTd>
                          {user.online ? (
                            <Badge variant="success">Online</Badge>
                          ) : (
                            <span className="text-xs text-[var(--muted-strong)]">
                              {user.lastHeartbeatAt
                                ? `Last ${new Date(user.lastHeartbeatAt).toLocaleString()}`
                                : 'No session'}
                            </span>
                          )}
                        </AdminTd>
                        <AdminTd className="text-xs">
                          {user.subscription ? (
                            <span className="font-medium text-[var(--ink)]">
                              {user.subscription.plan.name}
                            </span>
                          ) : user.trialActive ? (
                            <Badge variant="info">Trial</Badge>
                          ) : (
                            <span className="text-[var(--muted-strong)]">Trial ended</span>
                          )}
                        </AdminTd>
                        <AdminTd muted className="text-xs whitespace-nowrap">
                          {user.attemptCount} MCQ · {user.practiceAttemptCount} practice
                        </AdminTd>
                        <AdminTd muted className="text-xs whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </AdminTd>
                        <AdminTd align="right">
                          <AdminRowActions
                            primary={
                              <Link href={`/admin/users/${user.id}`}>
                                <Button size="sm" variant="outline">
                                  View
                                </Button>
                              </Link>
                            }
                          >
                            {user.role !== 'ADMIN' ? (
                              user.status === 'ACTIVE' ? (
                                <ConfirmButton
                                  size="sm"
                                  variant="ghost"
                                  confirmTitle="Suspend this user?"
                                  confirmMessage={`Suspend ${user.name}? They will not be able to sign in until reinstated.`}
                                  confirmLabel="Suspend"
                                  reversible
                                  onConfirm={() =>
                                    updateStatus.mutateAsync({ id: user.id, status: 'SUSPENDED' })
                                  }
                                >
                                  Suspend
                                </ConfirmButton>
                              ) : (
                                <ConfirmButton
                                  size="sm"
                                  variant="ghost"
                                  confirmTitle="Reinstate this user?"
                                  confirmMessage={`Reinstate ${user.name} and restore sign-in access?`}
                                  confirmLabel="Reinstate"
                                  destructive={false}
                                  reversible
                                  onConfirm={() =>
                                    updateStatus.mutateAsync({ id: user.id, status: 'ACTIVE' })
                                  }
                                >
                                  Reinstate
                                </ConfirmButton>
                              )
                            ) : (
                              <Button size="sm" variant="ghost" disabled>
                                Protected
                              </Button>
                            )}
                          </AdminRowActions>
                        </AdminTd>
                      </tr>
                    ))
                  )}
                </tbody>
              </AdminTable>
            </AdminTableShell>
            <div className="md:hidden">
              <LoadMoreButton
                hasNextPage={list.hasNextPage}
                isFetchingNextPage={list.isFetchingNextPage}
                onLoadMore={() => void list.fetchNextPage()}
              />
            </div>
            </>
          )}
        </ContentIn>
      ) : null}
    </AdminPage>
  );
}
