'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import type { SiteAccessSettings } from '@your-academy/shared';
import { AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, FieldHint } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { errorMessage, formatDateTime } from '@/features/admin/billing/billing-format';
import { adminBillingApi } from '@/lib/api/admin-billing';

const QUERY_KEY = ['admin-access-settings'];

/** DEC-060 — Paid System ON / OFF and the free Preli / Written set counts. */
export default function AdminPaidSystemPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: QUERY_KEY, queryFn: adminBillingApi.getSettings });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preliN, setPreliN] = useState('');
  const [writtenN, setWrittenN] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    setPreliN(String(settings.data.preliFreeSetCount));
    setWrittenN(String(settings.data.writtenFreeSetCount));
  }, [settings.data]);

  const update = useMutation({
    mutationFn: adminBillingApi.updateSettings,
    onSuccess: (data: SiteAccessSettings) => {
      qc.setQueryData(QUERY_KEY, data);
      setMessage({ kind: 'success', text: 'Settings saved — they apply immediately.' });
      setConfirmOpen(false);
    },
    onError: (err) => {
      setMessage({ kind: 'danger', text: errorMessage(err, 'Could not save settings') });
      setConfirmOpen(false);
    },
  });

  if (settings.isLoading) {
    return (
      <AdminPage>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </AdminPage>
    );
  }
  if (settings.error || !settings.data) {
    return (
      <LoadError
        message="Could not load paid-system settings."
        onRetry={() => void settings.refetch()}
      />
    );
  }

  const on = settings.data.paidSystemEnabled;
  const parseN = (v: string) => (/^\d{1,5}$/.test(v.trim()) ? Number(v.trim()) : null);
  const p = parseN(preliN);
  const w = parseN(writtenN);
  const countsValid = p !== null && w !== null && p <= 10000 && w <= 10000;
  const countsDirty =
    p !== settings.data.preliFreeSetCount || w !== settings.data.writtenFreeSetCount;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Billing"
        title="Paid system"
        description="Turn Free vs Paid access on or off and choose how many Preli / Written sets free users can open. Changes take effect immediately — no redeploy."
      />

      {message ? <Alert variant={message.kind}>{message.text}</Alert> : null}

      <AdminSection title="Paid System">
        <Surface className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              {on ? (
                <Lock className="size-4 text-[var(--warning-fg)]" aria-hidden />
              ) : (
                <LockOpen className="size-4 text-[var(--success-fg)]" aria-hidden />
              )}
              <span className="font-semibold text-[var(--ink)]">Paid System:</span>
              <Badge variant={on ? 'warning' : 'success'}>{on ? 'ON' : 'OFF'}</Badge>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">
              {on
                ? 'Free users see only the free sets and FREE model tests. Everything else shows a lock and a link to the Packages page.'
                : 'Everyone has full access to all content. Buy buttons are hidden and the server blocks new purchases.'}
            </p>
            <p className="text-xs text-[var(--muted-strong)]">
              Existing subscriptions keep their end dates either way. Last changed{' '}
              {formatDateTime(settings.data.updatedAt)}.
            </p>
          </div>
          <Button
            variant={on ? 'outline' : 'primary'}
            onClick={() => {
              setMessage(null);
              setConfirmOpen(true);
            }}
          >
            {on ? 'Turn OFF' : 'Turn ON'}
          </Button>
        </Surface>
      </AdminSection>

      <AdminSection
        title="Free sets"
        description="The first N sets in the order learners see them (newest first) are free. All other sets stay listed with a lock."
      >
        <Surface className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="preli-n">Free Preli sets (N)</Label>
              <Input
                id="preli-n"
                inputMode="numeric"
                value={preliN}
                onChange={(e) => setPreliN(e.target.value)}
              />
              <FieldHint>0 locks every Preli set for free users.</FieldHint>
            </Field>
            <Field>
              <Label htmlFor="written-n">Free Written sets (N)</Label>
              <Input
                id="written-n"
                inputMode="numeric"
                value={writtenN}
                onChange={(e) => setWrittenN(e.target.value)}
              />
              <FieldHint>0 locks every Written set for free users.</FieldHint>
            </Field>
          </div>
          {!countsValid ? (
            <p className="text-sm text-[var(--danger-fg)]">
              Enter whole numbers between 0 and 10000.
            </p>
          ) : null}
          <Button
            disabled={!countsValid || !countsDirty || update.isPending}
            onClick={() => {
              setMessage(null);
              update.mutate({ preliFreeSetCount: p!, writtenFreeSetCount: w! });
            }}
          >
            {update.isPending ? 'Saving…' : 'Save free set counts'}
          </Button>
        </Surface>
      </AdminSection>

      <ConfirmDialog
        open={confirmOpen}
        title={on ? 'Turn the paid system OFF?' : 'Turn the paid system ON?'}
        description={
          on
            ? 'Every user (including free and logged-out visitors) will get full access to all content right away. Purchase buttons are hidden and new purchases are blocked. Existing subscriptions keep their end dates.'
            : 'Free users will be limited to the free Preli / Written sets and FREE model tests. Everything else will be locked until they buy a package.'
        }
        confirmLabel={on ? 'Turn OFF' : 'Turn ON'}
        destructive={false}
        reversible
        pending={update.isPending}
        onConfirm={() => update.mutate({ paidSystemEnabled: !on })}
        onCancel={() => setConfirmOpen(false)}
      />
    </AdminPage>
  );
}
