'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
        description="Search learners and suspend or reinstate accounts."
      />

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void list.refetch();
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, WhatsApp, email"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {list.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {list.error ? <Alert variant="danger">Could not load users.</Alert> : null}

      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
        {list.data?.map((user) => (
          <li
            key={user.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-[var(--muted)]">
                {user.whatsappNumber}
                {user.email ? ` · ${user.email}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{user.role}</Badge>
              <Badge variant={user.status === 'ACTIVE' ? 'success' : 'outline'}>{user.status}</Badge>
              {user.role !== 'ADMIN' ? (
                user.status === 'ACTIVE' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: user.id, status: 'SUSPENDED' })}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ id: user.id, status: 'ACTIVE' })}
                  >
                    Reinstate
                  </Button>
                )
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
