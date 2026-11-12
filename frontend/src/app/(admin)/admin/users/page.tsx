'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { AdminPage, AdminToolbar } from '@/components/admin/admin-page';
import { AdminTable, AdminTableShell } from '@/components/admin/admin-table';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
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
    <AdminPage>
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Search learners, review engagement signals, and suspend or reinstate accounts."
      />

      <AdminToolbar>
        <form
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            setQApplied(q.trim());
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted-strong)]"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, WhatsApp, email"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | 'ACTIVE' | 'SUSPENDED')}
            className="lg:w-48"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
          <Button type="submit" variant="outline" className="sm:shrink-0">
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
        <ContentIn>
          <AdminTableShell
            minWidth="48rem"
            header={
              <p className="text-sm text-[var(--muted-strong)]">
                Showing {list.items.length} user{list.items.length === 1 ? '' : 's'}
                {list.hasNextPage ? '+' : ''}
                {qApplied ? ` for “${qApplied}”` : ''}
              </p>
            }
          >
            <AdminTable>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Presence</th>
                  <th>Access</th>
                  <th>Attempts</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[var(--muted-strong)]">
                      No users match this search.
                    </td>
                  </tr>
                ) : (
                  list.items.map((user) => (
                    <tr key={user.id}>
                      <td className="max-w-[14rem] sm:max-w-none">
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
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline">{user.role}</Badge>
                          <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                            {user.status}
                          </Badge>
                        </div>
                      </td>
                      <td>
                        {user.online ? (
                          <Badge variant="success">Online</Badge>
                        ) : (
                          <span className="text-xs text-[var(--muted-strong)]">
                            {user.lastHeartbeatAt
                              ? `Last ${new Date(user.lastHeartbeatAt).toLocaleString()}`
                              : 'No session'}
                          </span>
                        )}
                      </td>
                      <td className="text-xs">
                        {user.subscription ? (
                          <span className="font-medium text-[var(--ink)]">
                            {user.subscription.plan.name}
                          </span>
                        ) : user.trialActive ? (
                          <Badge variant="info">Trial</Badge>
                        ) : (
                          <span className="text-[var(--muted-strong)]">Trial ended</span>
                        )}
                      </td>
                      <td className="text-xs text-[var(--muted-strong)]">
                        {user.attemptCount} MCQ · {user.practiceAttemptCount} practice
                      </td>
                      <td className="text-xs text-[var(--muted-strong)]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
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
                                variant="secondary"
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
                            <span className="text-xs text-[var(--muted-strong)]">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </AdminTableShell>
          <LoadMoreButton
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </ContentIn>
      ) : null}
    </AdminPage>
  );
}
