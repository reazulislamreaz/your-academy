'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Input } from '@/components/ui/input';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Surface } from '@/components/ui/surface';
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Search learners, review engagement signals, and suspend or reinstate accounts."
      />

      <Surface className="p-4 sm:p-5">
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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | 'ACTIVE' | 'SUSPENDED')}
            className="h-11 rounded-[var(--radius)] border border-[var(--line-strong)] bg-[var(--bg-elevated)] px-3 text-sm"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <Button type="submit" variant="outline" className="sm:shrink-0">
            Search
          </Button>
        </form>
      </Surface>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {list.isLoading ? <AdminUsersTableSkeleton /> : null}
      {list.error ? <Alert variant="danger">Could not load users.</Alert> : null}

      {!list.isLoading && list.data ? (
        <ContentIn>
          <Surface className="overflow-hidden p-0">
            <div className="min-w-0 w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="bg-[var(--bg-desk)] text-xs font-semibold tracking-[0.08em] text-[var(--muted-strong)] uppercase">
                  <tr>
                    <th className="px-3 py-3 font-semibold sm:px-5">User</th>
                    <th className="px-3 py-3 font-semibold">Presence</th>
                    <th className="px-3 py-3 font-semibold">Access</th>
                    <th className="px-3 py-3 font-semibold">Attempts</th>
                    <th className="px-3 py-3 font-semibold">Joined</th>
                    <th className="px-3 py-3 text-right font-semibold sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {list.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-10 text-center text-[var(--muted-strong)] sm:px-5"
                      >
                        No users match this search.
                      </td>
                    </tr>
                  ) : (
                    list.items.map((user) => (
                      <tr key={user.id} className="hover:bg-[var(--brand-wash)]">
                        <td className="max-w-[14rem] px-3 py-3.5 sm:max-w-none sm:px-5">
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
                        <td className="px-3 py-3.5">
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
                        <td className="px-3 py-3.5 text-xs">
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
                        <td className="px-3 py-3.5 text-xs text-[var(--muted-strong)]">
                          {user.attemptCount} MCQ · {user.practiceAttemptCount} practice
                        </td>
                        <td className="px-3 py-3.5 text-xs text-[var(--muted-strong)]">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
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
              </table>
            </div>
            <div className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted-strong)]">
              Showing {list.items.length} user{list.items.length === 1 ? '' : 's'}
              {list.hasNextPage ? '+' : ''}
              {qApplied ? ` for “${qApplied}”` : ''}
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
