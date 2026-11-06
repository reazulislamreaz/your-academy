'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/features/auth/use-auth';
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
  const me = useMe();
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

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) =>
      apiFetch(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Role update failed');
    },
  });

  const extendTrial = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/users/${id}/trial`, {
        method: 'PATCH',
        body: JSON.stringify({ extendDays: 7 }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Trial extension failed');
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Search learners, manage roles and trials, and suspend or reinstate accounts."
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
        {list.data?.map((user) => {
          const isSelf = me.data?.id === user.id;
          const trialActive = new Date(user.trialEndsAt) > new Date();
          return (
          <li
            key={user.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">
                {user.name}
                {isSelf ? <span className="ml-2 text-xs text-[var(--muted)]">(you)</span> : null}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {user.whatsappNumber}
                {user.email ? ` · ${user.email}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Trial {trialActive ? 'active' : 'expired'} · ends{' '}
                {new Date(user.trialEndsAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{user.role}</Badge>
              <Badge variant={user.status === 'ACTIVE' ? 'success' : 'outline'}>{user.status}</Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={extendTrial.isPending}
                onClick={() => extendTrial.mutate(user.id)}
              >
                Extend trial +7 days
              </Button>
              {!isSelf ? (
                user.role === 'ADMIN' ? (
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    confirmMessage={`Demote ${user.name} to a regular user? They will lose admin access.`}
                    onConfirm={() => updateRole.mutate({ id: user.id, role: 'USER' })}
                  >
                    Demote to user
                  </ConfirmButton>
                ) : (
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    confirmMessage={`Promote ${user.name} to admin? They will gain full admin access.`}
                    onConfirm={() => updateRole.mutate({ id: user.id, role: 'ADMIN' })}
                  >
                    Promote to admin
                  </ConfirmButton>
                )
              ) : null}
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
          );
        })}
      </ul>
    </div>
  );
}
