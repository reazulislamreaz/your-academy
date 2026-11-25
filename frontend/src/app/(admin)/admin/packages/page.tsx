'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PACKAGE_DURATION_LABELS, type AdminSubscriptionPackageDto } from '@your-academy/shared';
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
import { PackageFormDialog } from '@/features/admin/billing/package-form-dialog';
import { adminBillingApi, type PackageInput } from '@/lib/api/admin-billing';

const QUERY_KEY = ['admin-packages'];

/** DEC-060 — admin-managed subscription packages. */
export default function AdminPackagesPage() {
  const qc = useQueryClient();
  const packages = useQuery({ queryKey: QUERY_KEY, queryFn: adminBillingApi.listPackages });
  const [editing, setEditing] = useState<AdminSubscriptionPackageDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: QUERY_KEY });

  const save = useMutation({
    mutationFn: (input: PackageInput) =>
      editing
        ? adminBillingApi.updatePackage(editing.id, input)
        : adminBillingApi.createPackage(input),
    onSuccess: (pkg) => {
      setDialogOpen(false);
      setFormError(null);
      setMessage({ kind: 'success', text: `Package “${pkg.name}” saved.` });
      refresh();
    },
    onError: (err) => setFormError(errorMessage(err, 'Could not save the package')),
  });

  const toggleActive = useMutation({
    mutationFn: (pkg: AdminSubscriptionPackageDto) =>
      adminBillingApi.updatePackage(pkg.id, { isActive: !pkg.isActive }),
    onSuccess: (pkg) => {
      setMessage({
        kind: 'success',
        text: `“${pkg.name}” is now ${pkg.isActive ? 'enabled' : 'disabled'}.`,
      });
      refresh();
    },
    onError: (err) => setMessage({ kind: 'danger', text: errorMessage(err, 'Update failed') }),
  });

  const remove = useMutation({
    mutationFn: (pkg: AdminSubscriptionPackageDto) => adminBillingApi.deletePackage(pkg.id),
    onSuccess: (res) => {
      setMessage({
        kind: 'success',
        text: res.softDeleted
          ? 'Package hidden — it was already purchased, so it is kept for payment history.'
          : 'Package deleted.',
      });
      refresh();
    },
    onError: (err) => setMessage({ kind: 'danger', text: errorMessage(err, 'Delete failed') }),
  });

  const openDialog = (pkg: AdminSubscriptionPackageDto | null) => {
    setEditing(pkg);
    setFormError(null);
    setDialogOpen(true);
  };

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Billing"
        title="Packages"
        description="Active packages appear on the public Packages page with a Buy button. Purchased packages are hidden (soft-deleted) instead of removed so payment history stays correct."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => openDialog(null)}>
            <Plus className="size-4" aria-hidden />
            New package
          </Button>
        }
      />

      {message ? <Alert variant={message.kind}>{message.text}</Alert> : null}
      {packages.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {packages.error ? (
        <LoadError message="Could not load packages." onRetry={() => void packages.refetch()} />
      ) : null}

      {packages.data ? (
        <AdminTableShell minWidth="48rem">
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>Package</AdminTh>
                <AdminTh>Duration</AdminTh>
                <AdminTh>Price</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Orders</AdminTh>
                <AdminTh align="right">Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {packages.data.length === 0 ? (
                <AdminEmptyRow colSpan={6}>
                  No packages yet — create one so learners can subscribe.
                </AdminEmptyRow>
              ) : (
                packages.data.map((pkg) => (
                  <tr key={pkg.id}>
                    <AdminTd className="max-w-[20rem]">
                      <p className="font-semibold text-[var(--ink)]">
                        {pkg.name}
                        {pkg.isPopular ? (
                          <Badge variant="warning" className="ml-2 align-middle">
                            Popular
                          </Badge>
                        ) : null}
                      </p>
                      {pkg.description ? (
                        <p className="truncate text-xs text-[var(--muted-strong)]">
                          {pkg.description}
                        </p>
                      ) : null}
                      {pkg.features.length ? (
                        <p className="text-xs text-[var(--muted-strong)]">
                          {pkg.features.length} feature{pkg.features.length === 1 ? '' : 's'}
                        </p>
                      ) : null}
                    </AdminTd>
                    <AdminTd>{PACKAGE_DURATION_LABELS[pkg.duration]}</AdminTd>
                    <AdminTd className="font-semibold whitespace-nowrap">
                      {formatBdt(pkg.effectivePriceBdt)}
                      {pkg.discountedPriceBdt ? (
                        <span className="ml-1.5 text-xs font-normal text-[var(--muted-strong)] line-through">
                          {formatBdt(pkg.priceBdt)}
                        </span>
                      ) : null}
                    </AdminTd>
                    <AdminTd>
                      <Badge variant={pkg.isActive ? 'success' : 'default'}>
                        {pkg.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </AdminTd>
                    <AdminTd muted>{pkg.orderCount}</AdminTd>
                    <AdminTd align="right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => openDialog(pkg)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={toggleActive.isPending}
                          onClick={() => toggleActive.mutate(pkg)}
                        >
                          {pkg.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <ConfirmButton
                          size="sm"
                          variant="ghost"
                          confirmTitle={`Delete “${pkg.name}”?`}
                          confirmMessage={
                            pkg.orderCount > 0
                              ? 'This package has payments, so it will be hidden (soft-deleted) and kept for payment history. Existing subscribers keep their access.'
                              : 'This package has never been purchased and will be deleted permanently.'
                          }
                          confirmLabel="Delete"
                          onConfirm={() => remove.mutateAsync(pkg)}
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
      ) : null}

      <PackageFormDialog
        open={dialogOpen}
        pkg={editing}
        pending={save.isPending}
        error={formError}
        onSubmit={(input) => save.mutate(input)}
        onClose={() => {
          if (!save.isPending) setDialogOpen(false);
        }}
      />
    </AdminPage>
  );
}
