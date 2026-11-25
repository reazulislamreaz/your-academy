'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Check, ExternalLink, Lock, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  PACKAGE_DURATION_LABELS,
  TOPIC_TRIAL_DAYS,
  resolvePlanFeatureLabel,
  type AdminPlanFeatureDto,
  type PlanKey,
} from '@your-academy/shared';
import { AdminPage } from '@/components/admin/admin-page';
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
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage, formatBdt } from '@/features/admin/billing/billing-format';
import {
  PlanFeatureFormDialog,
  type PlanFeatureFormValues,
} from '@/features/admin/billing/plan-feature-form-dialog';
import { adminBillingApi } from '@/lib/api/admin-billing';
import { adminPlanFeaturesApi, getPlanComparison } from '@/lib/api/plan-features';

const QUERY_KEY = ['admin-plan-features'];
const PLANS: Array<{ key: PlanKey; title: string; hint: string }> = [
  { key: 'FREE', title: 'Free plan', hint: 'What a signed-up learner gets without paying.' },
  { key: 'PAID', title: 'Paid plan', hint: 'What every paid package unlocks.' },
];

/** DEC-065 — edit the homepage "Access & Pricing" Free vs Paid cards (display only). */
export default function AdminPricingFeaturesPage() {
  const qc = useQueryClient();
  const features = useQuery({ queryKey: QUERY_KEY, queryFn: adminPlanFeaturesApi.list });
  const settings = useQuery({
    queryKey: ['admin-access-settings'],
    queryFn: adminBillingApi.getSettings,
  });
  const comparison = useQuery({ queryKey: ['plan-comparison'], queryFn: getPlanComparison });

  const [dialog, setDialog] = useState<{
    feature: AdminPlanFeatureDto | null;
    plan: PlanKey;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  const placeholderValues = settings.data
    ? {
        preliFreeSets: settings.data.preliFreeSetCount,
        writtenFreeSets: settings.data.writtenFreeSetCount,
        topicTrialDays: TOPIC_TRIAL_DAYS,
      }
    : null;

  const byPlan = useMemo(() => {
    const rows = features.data ?? [];
    return {
      FREE: rows.filter((r) => r.planKey === 'FREE').sort((a, b) => a.sortOrder - b.sortOrder),
      PAID: rows.filter((r) => r.planKey === 'PAID').sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }, [features.data]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEY });
    // Homepage cards read this with no-cache, so they show the change on the next visit.
    void qc.invalidateQueries({ queryKey: ['plan-comparison'] });
  };
  const fail = (fallback: string) => (err: unknown) =>
    setMessage({ kind: 'danger', text: errorMessage(err, fallback) });

  const save = useMutation({
    mutationFn: (values: PlanFeatureFormValues) =>
      dialog?.feature
        ? adminPlanFeaturesApi.update(dialog.feature.id, {
            label: values.label,
            isIncluded: values.isIncluded,
            isActive: values.isActive,
          })
        : adminPlanFeaturesApi.create(values),
    onSuccess: (row) => {
      setDialog(null);
      setFormError(null);
      setMessage({ kind: 'success', text: `Saved “${row.label}”.` });
      refresh();
    },
    onError: (err) => setFormError(errorMessage(err, 'Could not save the feature')),
  });

  const toggle = useMutation({
    mutationFn: (row: AdminPlanFeatureDto) =>
      adminPlanFeaturesApi.update(row.id, { isActive: !row.isActive }),
    onSuccess: (row) => {
      setMessage({
        kind: 'success',
        text: `“${row.label}” is now ${row.isActive ? 'shown' : 'hidden'} on the homepage.`,
      });
      refresh();
    },
    onError: fail('Update failed'),
  });

  const move = useMutation({
    mutationFn: ({ plan, from, to }: { plan: PlanKey; from: number; to: number }) => {
      const ids = byPlan[plan].map((r) => r.id);
      const [id] = ids.splice(from, 1);
      ids.splice(to, 0, id!);
      return adminPlanFeaturesApi.reorder(plan, ids);
    },
    onSuccess: (rows) => {
      qc.setQueryData(QUERY_KEY, rows);
      refresh();
    },
    onError: fail('Could not reorder'),
  });

  const remove = useMutation({
    mutationFn: (row: AdminPlanFeatureDto) => adminPlanFeaturesApi.remove(row.id),
    onSuccess: () => {
      setMessage({ kind: 'success', text: 'Feature deleted.' });
      refresh();
    },
    onError: fail('Delete failed'),
  });

  const cheapest = comparison.data?.paid.cheapest;

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Billing"
        title="Pricing & Plan Features"
        description="The Free and Paid cards in the homepage “Access & Pricing” section. Display only — what people can actually open is decided by the paid-system rules, not by this list."
        actions={
          <div className="flex flex-wrap gap-2">
            <a href="/#access" target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ExternalLink className="size-4" aria-hidden />
                Preview
              </Button>
            </a>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setDialog({ feature: null, plan: 'FREE' })}
            >
              <Plus className="size-4" aria-hidden />
              New feature
            </Button>
          </div>
        }
      />

      <Alert variant="info">
        <span>
          Keep this list consistent with the package features in{' '}
          <Link href="/admin/packages" className="font-semibold underline">
            Admin → Packages
          </Link>{' '}
          (shown on the Packages page). The section heading, intro text, Free-card button and FAQ
          are edited in{' '}
          <Link href="/admin/homepage" className="font-semibold underline">
            Admin → Homepage
          </Link>
          .
        </span>
      </Alert>

      <div className="grid gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4 text-sm sm:grid-cols-2">
        <p>
          <span className="block text-xs font-semibold text-[var(--muted-strong)]">
            Free card price
          </span>
          ৳0 — always free
        </p>
        <p>
          <span className="block text-xs font-semibold text-[var(--muted-strong)]">
            Paid card price (cheapest active package)
          </span>
          {cheapest
            ? `${formatBdt(cheapest.effectivePriceBdt)} / ${PACKAGE_DURATION_LABELS[cheapest.duration].toLowerCase()} · ${cheapest.name}`
            : comparison.isLoading
              ? '…'
              : 'No active package'}{' '}
          ·{' '}
          <Link href="/admin/packages" className="font-semibold text-[var(--highlight)] underline">
            Edit prices in Packages
          </Link>
        </p>
      </div>

      {message ? <Alert variant={message.kind}>{message.text}</Alert> : null}
      {features.isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {features.error ? (
        <LoadError
          message="Could not load plan features."
          onRetry={() => void features.refetch()}
        />
      ) : null}

      {features.data
        ? PLANS.map((plan) => {
            const rows = byPlan[plan.key];
            return (
              <section key={plan.key} className="space-y-2" aria-labelledby={`plan-${plan.key}`}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 id={`plan-${plan.key}`} className="font-display text-base font-bold">
                      {plan.title}
                    </h2>
                    <p className="text-sm text-[var(--muted-strong)]">{plan.hint}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setDialog({ feature: null, plan: plan.key })}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add to {plan.key === 'FREE' ? 'Free' : 'Paid'}
                  </Button>
                </div>
                <AdminTableShell minWidth="44rem">
                  <AdminTable>
                    <thead>
                      <tr>
                        <AdminTh>Order</AdminTh>
                        <AdminTh>Feature</AdminTh>
                        <AdminTh>Shows as</AdminTh>
                        <AdminTh>Status</AdminTh>
                        <AdminTh align="right">Actions</AdminTh>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <AdminEmptyRow colSpan={5}>
                          No features yet — the homepage falls back to the intro highlights while
                          both lists are empty.
                        </AdminEmptyRow>
                      ) : (
                        rows.map((row, i) => (
                          <tr key={row.id}>
                            <AdminTd>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Move “${row.label}” up`}
                                  disabled={i === 0 || move.isPending}
                                  onClick={() =>
                                    move.mutate({ plan: plan.key, from: i, to: i - 1 })
                                  }
                                >
                                  <ArrowUp className="size-4" aria-hidden />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Move “${row.label}” down`}
                                  disabled={i === rows.length - 1 || move.isPending}
                                  onClick={() =>
                                    move.mutate({ plan: plan.key, from: i, to: i + 1 })
                                  }
                                >
                                  <ArrowDown className="size-4" aria-hidden />
                                </Button>
                              </div>
                            </AdminTd>
                            <AdminTd className="max-w-[24rem]">
                              <p className="font-medium break-words text-[var(--ink)]">
                                {row.label}
                              </p>
                              {placeholderValues && /\{\w+\}/.test(row.label) ? (
                                <p className="text-xs text-[var(--muted-strong)]">
                                  Homepage: {resolvePlanFeatureLabel(row.label, placeholderValues)}
                                </p>
                              ) : null}
                            </AdminTd>
                            <AdminTd>
                              {row.isIncluded ? (
                                <Badge variant="success" className="gap-1">
                                  <Check className="size-3.5" aria-hidden /> Included
                                </Badge>
                              ) : (
                                <Badge variant="default" className="gap-1">
                                  <Lock className="size-3.5" aria-hidden /> Not included
                                </Badge>
                              )}
                            </AdminTd>
                            <AdminTd>
                              <Badge variant={row.isActive ? 'success' : 'default'}>
                                {row.isActive ? 'Active' : 'Hidden'}
                              </Badge>
                            </AdminTd>
                            <AdminTd align="right">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setFormError(null);
                                    setDialog({ feature: row, plan: row.planKey });
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={toggle.isPending}
                                  onClick={() => toggle.mutate(row)}
                                >
                                  {row.isActive ? 'Hide' : 'Show'}
                                </Button>
                                <ConfirmButton
                                  size="sm"
                                  variant="ghost"
                                  confirmTitle={`Delete “${row.label}”?`}
                                  confirmMessage="It is removed from the homepage card. Use Hide instead if you may want it back."
                                  confirmLabel="Delete"
                                  onConfirm={() => remove.mutateAsync(row)}
                                >
                                  Delete
                                </ConfirmButton>
                              </div>
                            </AdminTd>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </AdminTable>
                </AdminTableShell>
              </section>
            );
          })
        : null}

      <PlanFeatureFormDialog
        open={dialog !== null}
        feature={dialog?.feature ?? null}
        defaultPlan={dialog?.plan ?? 'FREE'}
        placeholderValues={placeholderValues}
        pending={save.isPending}
        error={formError}
        onSubmit={(values) => save.mutate(values)}
        onClose={() => {
          setDialog(null);
          setFormError(null);
        }}
      />
    </AdminPage>
  );
}
