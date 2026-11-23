'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import type {
  AdminGrantSubscriptionInput,
  AdminSubscriptionRecord,
  AdminUserSubscriptionOverview,
} from '@your-academy/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api/client';

const PRESET_DAYS = [30, 90, 180, 365] as const;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** `YYYY-MM-DD` in the admin's local time zone (for `<input type="date">`). */
function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusBadge(record: AdminSubscriptionRecord) {
  if (record.isCurrent) return <Badge variant="success">Active</Badge>;
  if (record.status === 'ACTIVE' && new Date(record.startsAt) > new Date()) {
    return <Badge variant="info">Scheduled</Badge>;
  }
  if (record.status === 'CANCELED') return <Badge variant="danger">Revoked</Badge>;
  return <Badge variant="default">Expired</Badge>;
}

function GrantSubscriptionDialog({
  userId,
  open,
  onClose,
  onGranted,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  onGranted: (data: AdminUserSubscriptionOverview) => void;
}) {
  const today = toDateInput(new Date());
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState(toDateInput(addDays(new Date(), 30)));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Start of the chosen local day (or "now" when blank); access lasts through the end day.
  const startsAt = startsOn ? new Date(`${startsOn}T00:00:00`) : null;
  const endsAt = endsOn ? new Date(`${endsOn}T23:59:59`) : null;
  const valid =
    endsAt != null &&
    !Number.isNaN(endsAt.getTime()) &&
    endsAt.getTime() > Date.now() &&
    (startsAt == null || (!Number.isNaN(startsAt.getTime()) && endsAt > startsAt));

  const grant = useMutation({
    mutationFn: () => {
      const body: AdminGrantSubscriptionInput = {
        endsAt: endsAt!.toISOString(),
        ...(startsAt ? { startsAt: startsAt.toISOString() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      return apiFetch<AdminUserSubscriptionOverview>(`/admin/users/${userId}/subscription`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      setError(null);
      setNote('');
      onGranted(data);
      onClose();
    },
    onError: (err) => setError(errorMessage(err, 'Could not grant the subscription')),
  });

  return (
    <FormDialog
      open={open}
      title="Grant subscription"
      description="Gives this learner access to correct answers and explanations until the end date. Any current subscription is replaced."
      confirmLabel="Grant access"
      pending={grant.isPending}
      error={error}
      disableSubmit={!valid}
      onSubmit={() => grant.mutate()}
      onClose={() => {
        if (grant.isPending) return;
        setError(null);
        onClose();
      }}
    >
      <Field>
        <Label htmlFor="sub-ends-on">Access until</Label>
        <Input
          id="sub-ends-on"
          type="date"
          min={startsOn || today}
          value={endsOn}
          onChange={(e) => setEndsOn(e.target.value)}
          required
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick durations">
          {PRESET_DAYS.map((days) => (
            <Button
              key={days}
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setEndsOn(
                  toDateInput(addDays(startsOn ? new Date(`${startsOn}T00:00:00`) : new Date(), days)),
                )
              }
            >
              {days} days
            </Button>
          ))}
        </div>
      </Field>
      <Field>
        <Label htmlFor="sub-starts-on">Starts on (optional)</Label>
        <Input
          id="sub-starts-on"
          type="date"
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
        />
        <FieldHint>Leave blank to start immediately.</FieldHint>
      </Field>
      <Field>
        <Label htmlFor="sub-note">Note (optional)</Label>
        <Textarea
          id="sub-note"
          value={note}
          maxLength={500}
          rows={3}
          placeholder="e.g. Paid via bKash, ref …"
          onChange={(e) => setNote(e.target.value)}
        />
        <FieldHint>Saved in the audit log only.</FieldHint>
      </Field>
    </FormDialog>
  );
}

/** DEC-052 — Admin view of a user's subscription with grant / revoke. */
export function UserSubscriptionCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const queryKey = ['admin-user-subscription', userId];
  const [grantOpen, setGrantOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overview = useQuery({
    queryKey,
    queryFn: () =>
      apiFetch<AdminUserSubscriptionOverview>(`/admin/users/${userId}/subscription`),
    enabled: Boolean(userId),
  });

  const applyUpdate = (data: AdminUserSubscriptionOverview) => {
    qc.setQueryData(queryKey, data);
    void qc.invalidateQueries({ queryKey: ['admin-user', userId] });
    void qc.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const revoke = useMutation({
    mutationFn: () =>
      apiFetch<AdminUserSubscriptionOverview>(`/admin/users/${userId}/subscription/revoke`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (data) => {
      setError(null);
      applyUpdate(data);
    },
    onError: (err) => setError(errorMessage(err, 'Could not revoke the subscription')),
  });

  if (overview.isLoading) {
    return (
      <Surface className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-48" />
      </Surface>
    );
  }
  if (overview.isError || !overview.data) {
    return <Alert variant="danger">Could not load subscription details.</Alert>;
  }

  const { current, history, isAdmin } = overview.data;
  const scheduled = history.find(
    (r) => r.status === 'ACTIVE' && !r.isCurrent && new Date(r.startsAt) > new Date(),
  );
  const revocable = Boolean(current || scheduled);

  return (
    <Surface className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
            Subscription
          </p>
          {isAdmin ? (
            <p className="text-sm text-[var(--ink-soft)]">
              Admins see all answers without a subscription.
            </p>
          ) : current ? (
            <p className="text-sm text-[var(--ink)]">
              <span className="font-semibold">{current.planName}</span> · until{' '}
              {formatDate(current.endsAt)}
            </p>
          ) : scheduled ? (
            <p className="text-sm text-[var(--ink)]">
              Starts {formatDate(scheduled.startsAt)} · until {formatDate(scheduled.endsAt)}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted-strong)]">
              No active subscription — answers and explanations are hidden.
            </p>
          )}
        </div>
        {current ? <Badge variant="success">Active</Badge> : null}
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {!isAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setGrantOpen(true)}>
            <CalendarPlus className="size-4" aria-hidden />
            {revocable ? 'Extend / replace' : 'Grant subscription'}
          </Button>
          {revocable ? (
            <ConfirmButton
              size="sm"
              variant="danger"
              confirmTitle="Revoke subscription?"
              confirmMessage="This learner will immediately lose access to correct answers and explanations."
              confirmLabel="Revoke"
              onConfirm={() => revoke.mutateAsync()}
            >
              Revoke
            </ConfirmButton>
          ) : null}
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--muted)]">History</p>
          <ul className="divide-y divide-[var(--line)] text-sm">
            {history.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
              >
                <span className="text-[var(--ink-soft)]">
                  {formatDate(record.startsAt)} – {formatDate(record.endsAt)}
                  {record.canceledAt ? ` · revoked ${formatDate(record.canceledAt)}` : ''}
                </span>
                {statusBadge(record)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!isAdmin ? (
        <GrantSubscriptionDialog
          userId={userId}
          open={grantOpen}
          onClose={() => setGrantOpen(false)}
          onGranted={applyUpdate}
        />
      ) : null}
    </Surface>
  );
}
