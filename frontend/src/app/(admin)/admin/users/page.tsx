'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';

type AdminUser = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  role: string;
  status: string;
  trialEndsAt: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin-users', q],
    queryFn: () =>
      apiFetch<AdminUser[]>(`/admin/users${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      apiFetch(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Search learners and suspend or reinstate accounts. Role changes stay out of scope for v1."
      />

      <Surface className="p-4 sm:p-5">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void list.refetch();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, WhatsApp, email"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" className="rounded-full sm:shrink-0">
            Search
          </Button>
        </form>
      </Surface>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {list.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {list.error ? <Alert variant="danger">Could not load users.</Alert> : null}

      {list.data ? (
        <Surface className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-[var(--bg-desk)] text-[11px] tracking-[0.08em] text-[var(--muted)] uppercase">
                <tr>
                  <th className="px-3 py-3 font-semibold sm:px-5">User</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Trial ends</th>
                  <th className="px-3 py-3 font-semibold sm:px-5">Joined</th>
                  <th className="px-3 py-3 text-right font-semibold sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {list.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-[var(--muted)] sm:px-5">
                      No users match this search.
                    </td>
                  </tr>
                ) : (
                  list.data.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--brand-wash)]">
                      <td className="max-w-[12rem] px-3 py-3.5 sm:max-w-none sm:px-5">
                        <p className="truncate font-semibold text-[var(--ink)]">{user.name}</p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {user.whatsappNumber}
                          {user.email ? ` · ${user.email}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge variant="outline">{user.role}</Badge>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-xs text-[var(--muted)]">
                        {new Date(user.trialEndsAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--muted)]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {user.role !== 'ADMIN' ? (
                          user.status === 'ACTIVE' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-full"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: user.id, status: 'SUSPENDED' })
                              }
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="rounded-full"
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                updateStatus.mutate({ id: user.id, status: 'ACTIVE' })
                              }
                            >
                              Reinstate
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-[var(--muted)]">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
            Showing {list.data.length} user{list.data.length === 1 ? '' : 's'}
            {q.trim() ? ` for “${q.trim()}”` : ''}
          </div>
        </Surface>
      ) : null}
    </div>
  );
}
