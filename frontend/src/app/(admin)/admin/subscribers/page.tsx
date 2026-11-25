'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import {
  ROLE_LABELS,
  SUBSCRIPTION_STATES,
  type AdminSubscriberRow,
  type SubscriptionState,
  type UserRole,
} from '@your-academy/shared';
import { AdminListMeta, AdminPage, AdminToolbar } from '@/components/admin/admin-page';
import {
  AdminEmptyRow,
  AdminTable,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-table';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SUBSCRIPTION_STATE_LABELS,
  SubscriptionStateBadge,
  formatDate,
} from '@/features/admin/billing/billing-format';
import { adminBillingApi } from '@/lib/api/admin-billing';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

/** DEC-060 — every user with Free / Active / Expired / Disabled status. */
export default function AdminSubscribersPage() {
  const [q, setQ] = useState('');
  const qApplied = useDebouncedValue(q.trim(), 350);
  const [state, setState] = useState<'' | SubscriptionState>('');
  const [packageId, setPackageId] = useState('');
  const packages = useQuery({
    queryKey: ['admin-packages'],
    queryFn: adminBillingApi.listPackages,
  });

  const list = useCursorList<AdminSubscriberRow>(
    ['admin-subscribers', qApplied, state, packageId],
    (cursor) => {
      const params = new URLSearchParams({ limit: '30' });
      if (qApplied) params.set('q', qApplied);
      if (state) params.set('state', state);
      if (packageId) params.set('packageId', packageId);
      if (cursor) params.set('cursor', cursor);
      return `/admin/subscribers?${params}`;
    },
  );
  const total = list.data?.pages[0]?.pagination?.total ?? null;
  const reminders = useMutation({ mutationFn: adminBillingApi.runReminders });

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Billing"
        title="Subscribers"
        description="Subscription status of every user. Open a user to grant, extend, or disable access."
        actions={
          <Button
            size="sm"
            variant="outline"
            loading={reminders.isPending}
            onClick={() => reminders.mutate()}
          >
            Send due reminders
          </Button>
        }
      />
      {reminders.data ? (
        <Alert variant={reminders.data.failed ? 'warning' : 'success'}>
          Expiry reminders queued: {reminders.data.sent7} × 7-day, {reminders.data.sent3} × 3-day
          {reminders.data.failed ? `, ${reminders.data.failed} failed (retried next run)` : ''}.
          They also go out automatically every hour; each one is sent once per plan period.
        </Alert>
      ) : null}
      {reminders.error ? <Alert variant="danger">Could not run the reminders.</Alert> : null}

      <AdminToolbar>
        <div className="admin-filter-grid">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder="Search name, WhatsApp, or email"
            aria-label="Search users"
          />
          <Select
            value={state}
            onChange={(e) => setState(e.target.value as '' | SubscriptionState)}
            className="h-10 w-full sm:w-44"
            aria-label="Filter by subscription status"
          >
            <option value="">All statuses</option>
            {SUBSCRIPTION_STATES.map((s) => (
              <option key={s} value={s}>
                {SUBSCRIPTION_STATE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="h-10 w-full sm:w-52"
            aria-label="Filter by package"
          >
            <option value="">All packages</option>
            {(packages.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </AdminToolbar>

      {list.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {list.error ? (
        <LoadError message="Could not load subscribers." onRetry={() => void list.refetch()} />
      ) : null}

      {!list.isLoading && list.data ? (
        <AdminTableShell
          minWidth="52rem"
          header={
            <AdminListMeta
              count={total ?? list.items.length}
              noun="user"
              hasMore={total === null && list.hasNextPage}
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
                <AdminTh>Status</AdminTh>
                <AdminTh>Package</AdminTh>
                <AdminTh>Expires</AdminTh>
                <AdminTh align="right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {list.items.length === 0 ? (
                <AdminEmptyRow colSpan={5}>No users match these filters.</AdminEmptyRow>
              ) : (
                list.items.map(({ user, subscription }) => (
                  <tr key={user.id}>
                    <AdminTd className="max-w-[18rem]">
                      <Link
                        href={`/admin/subscribers/${user.id}`}
                        className="truncate font-semibold text-[var(--ink)] hover:underline"
                      >
                        {user.name}
                      </Link>
                      <p className="truncate text-xs text-[var(--muted-strong)]">
                        {user.whatsappNumber}
                        {user.email ? ` · ${user.email}` : ''}
                      </p>
                      {user.role !== 'USER' ? (
                        <Badge variant="outline" className="mt-1">
                          {ROLE_LABELS[user.role as UserRole] ?? user.role}
                        </Badge>
                      ) : null}
                    </AdminTd>
                    <AdminTd>
                      <SubscriptionStateBadge state={subscription.state} />
                    </AdminTd>
                    <AdminTd className="text-sm">
                      {subscription.endsAt ? (subscription.packageName ?? 'Custom') : '—'}
                    </AdminTd>
                    <AdminTd muted className="text-xs whitespace-nowrap">
                      {formatDate(subscription.endsAt)}
                      {subscription.cancelAtPeriodEnd ? (
                        <span className="block text-[var(--warning-fg)]">Renewal cancelled</span>
                      ) : subscription.scheduledPackageName ? (
                        <span className="block">
                          → {subscription.scheduledPackageName} at renewal
                        </span>
                      ) : null}
                    </AdminTd>
                    <AdminTd align="right">
                      <Link href={`/admin/subscribers/${user.id}`}>
                        <Button size="sm" variant="outline">
                          Manage
                        </Button>
                      </Link>
                    </AdminTd>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      ) : null}
    </AdminPage>
  );
}
