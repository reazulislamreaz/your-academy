'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  type SocialLinkAdmin,
  type SocialPlatform,
} from '@your-academy/shared';
import { AdminFormPanel, AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { ApiError } from '@/lib/api/client';
import { revalidateSocialLinksCache } from '@/lib/api/revalidate-social-links';
import {
  createAdminSocialLink,
  deleteAdminSocialLink,
  listAdminSocialLinks,
  reorderAdminSocialLinks,
  updateAdminSocialLink,
} from '@/lib/api/social-links';
import { SocialPlatformIcon } from '@/lib/marketing/social-platform-icon';

const QUERY_KEY = ['admin', 'social-links'] as const;

export function SocialLinksAdmin() {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<SocialPlatform>('FACEBOOK');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { url: string; label: string }>>({});

  const list = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listAdminSocialLinks,
  });

  const usedPlatforms = useMemo(
    () => new Set((list.data ?? []).map((row) => row.platform)),
    [list.data],
  );

  const availablePlatforms = useMemo(
    () => SOCIAL_PLATFORMS.filter((p) => !usedPlatforms.has(p)),
    [usedPlatforms],
  );

  const selectedPlatform = availablePlatforms.includes(platform)
    ? platform
    : (availablePlatforms[0] ?? 'FACEBOOK');

  async function afterMutation(message: string) {
    await qc.invalidateQueries({ queryKey: QUERY_KEY });
    const cache = await revalidateSocialLinksCache();
    setNotice(
      cache.ok
        ? message
        : `${message} Cache refresh lagged (${cache.detail ?? 'unknown'}) — hard-refresh the site if needed.`,
    );
  }

  const create = useMutation({
    mutationFn: () =>
      createAdminSocialLink({
        platform: selectedPlatform,
        url: url.trim(),
        label: label.trim() || undefined,
        enabled,
      }),
    onSuccess: async () => {
      setError(null);
      setUrl('');
      setLabel('');
      setEnabled(true);
      if (availablePlatforms[1]) setPlatform(availablePlatforms[1]);
      await afterMutation('Social link added. Live footer updated.');
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof ApiError ? err.message : 'Could not add social link');
    },
  });

  const saveRow = useMutation({
    mutationFn: (row: SocialLinkAdmin) => {
      const draft = drafts[row.id] ?? { url: row.url, label: row.label };
      return updateAdminSocialLink(row.id, {
        url: draft.url.trim(),
        label: draft.label.trim(),
      });
    },
    onSuccess: async () => {
      setError(null);
      await afterMutation('Social link saved.');
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof ApiError ? err.message : 'Could not save social link');
    },
  });

  const toggleEnabled = useMutation({
    mutationFn: (row: SocialLinkAdmin) =>
      updateAdminSocialLink(row.id, { enabled: !row.enabled }),
    onSuccess: async (_data, row) => {
      setError(null);
      await afterMutation(row.enabled ? 'Link disabled on the live footer.' : 'Link enabled on the live footer.');
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof ApiError ? err.message : 'Could not update visibility');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdminSocialLink(id),
    onSuccess: async () => {
      setError(null);
      await afterMutation('Social link deleted.');
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof ApiError ? err.message : 'Could not delete social link');
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: -1 | 1 }) => {
      const rows = list.data ?? [];
      const index = rows.findIndex((r) => r.id === id);
      const swap = index + direction;
      if (index < 0 || swap < 0 || swap >= rows.length) return rows;
      const next = [...rows];
      const a = next[index]!;
      const b = next[swap]!;
      next[index] = b;
      next[swap] = a;
      return reorderAdminSocialLinks(next.map((r) => r.id));
    },
    onSuccess: async () => {
      setError(null);
      await afterMutation('Footer order updated.');
    },
    onError: (err) => {
      setNotice(null);
      setError(err instanceof ApiError ? err.message : 'Could not reorder links');
    },
  });

  function draftFor(row: SocialLinkAdmin) {
    return drafts[row.id] ?? { url: row.url, label: row.label === SOCIAL_PLATFORM_LABELS[row.platform] ? '' : row.label };
  }

  return (
    <AdminPage>
      <PageHeader
        title="Social media links"
        description="Manage the icons shown in the public website footer. Only enabled links with a valid URL appear on the live site."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <AdminFormPanel
        title="Add social link"
        description="Pick a platform, paste the profile URL, then save. Each platform can be configured once."
        footer={
          <Button
            type="button"
            disabled={!availablePlatforms.length || create.isPending || !url.trim()}
            onClick={() => create.mutate()}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {create.isPending ? 'Adding…' : 'Add link'}
          </Button>
        }
      >
        {availablePlatforms.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="social-platform">Platform</Label>
              <Select
                id="social-platform"
                value={selectedPlatform}
                onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
              >
                {availablePlatforms.map((p) => (
                  <option key={p} value={p}>
                    {SOCIAL_PLATFORM_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="social-url">Profile URL</Label>
              <Input
                id="social-url"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="social-label">Custom label (optional)</Label>
              <Input
                id="social-label"
                placeholder={SOCIAL_PLATFORM_LABELS[selectedPlatform]}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--ink)] sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--line)]"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Show on live footer
            </label>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-strong)]">
            Every supported platform is already configured. Edit or delete an existing row to free a
            slot.
          </p>
        )}
      </AdminFormPanel>

      <AdminSection
        title="Configured links"
        description="Enable/disable, edit URLs, reorder, or delete. Changes refresh the marketing footer cache."
      >
        {list.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : list.isError ? (
          <Alert variant="danger">
            {list.error instanceof ApiError ? list.error.message : 'Failed to load social links'}
          </Alert>
        ) : !(list.data?.length) ? (
          <EmptyState
            title="No social links yet"
            description="Add Facebook, Instagram, YouTube, LinkedIn, X, WhatsApp, Telegram, or TikTok above."
          />
        ) : (
          <ul className="space-y-3">
            {list.data.map((row, index) => {
              const draft = draftFor(row);
              return (
                <li key={row.id}>
                  <Surface className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink)]">
                          <SocialPlatformIcon platform={row.platform} className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-semibold text-[var(--ink)]">
                            {SOCIAL_PLATFORM_LABELS[row.platform]}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {row.enabled ? 'Visible on footer' : 'Hidden from footer'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === 0 || move.isPending}
                          onClick={() => move.mutate({ id: row.id, direction: -1 })}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === list.data!.length - 1 || move.isPending}
                          onClick={() => move.mutate({ id: row.id, direction: 1 })}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <label className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--ink)]">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[var(--line)]"
                            checked={row.enabled}
                            disabled={toggleEnabled.isPending}
                            onChange={() => toggleEnabled.mutate(row)}
                          />
                          Enabled
                        </label>
                        <ConfirmButton
                          variant="outline"
                          size="sm"
                          confirmTitle={`Delete ${SOCIAL_PLATFORM_LABELS[row.platform]}?`}
                          confirmMessage="This removes the link from the admin list and the live footer."
                          confirmLabel="Delete"
                          onConfirm={() => remove.mutateAsync(row.id)}
                          disabled={remove.isPending}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          Delete
                        </ConfirmButton>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`url-${row.id}`}>URL</Label>
                          <Input
                            id={`url-${row.id}`}
                            type="url"
                            value={draft.url}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, url: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`label-${row.id}`}>Label override</Label>
                          <Input
                            id={`label-${row.id}`}
                            placeholder={SOCIAL_PLATFORM_LABELS[row.platform]}
                            value={draft.label}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...draft, label: e.target.value },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        className="sm:mb-0.5"
                        disabled={saveRow.isPending}
                        onClick={() => saveRow.mutate(row)}
                      >
                        <Save className="h-4 w-4" aria-hidden />
                        Save
                      </Button>
                    </div>
                  </Surface>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </AdminPage>
  );
}
