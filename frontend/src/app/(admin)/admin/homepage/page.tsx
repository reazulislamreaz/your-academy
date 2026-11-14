'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createDefaultHomepagePayload,
  HOMEPAGE_ICON_KEYS,
  type HomepagePayload,
} from '@your-academy/shared';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { HomepageBankBrowse } from '@/components/marketing/homepage-bank-browse';
import { HomepageHero } from '@/components/marketing/homepage-hero';
import { HomepageLatestQuestions } from '@/components/marketing/homepage-latest-questions';
import { HomepageMidSections } from '@/components/marketing/homepage-mid-sections';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api/client';
import {
  getAdminHomepage,
  publishHomepage,
  restoreHomepage,
  saveHomepageDraft,
} from '@/lib/api/homepage';
import type { CategoryNode } from '@/lib/api/types';
import { getStorageStatus, uploadViaSignedRequest } from '@/lib/cloudinary-upload';
import { cn } from '@/lib/utils';

type TabId = 'hero' | 'categories' | 'topics' | 'mid' | 'latest' | 'newsletter';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'hero', label: 'Hero' },
  { id: 'categories', label: 'Categories' },
  { id: 'topics', label: 'Topics' },
  { id: 'mid', label: 'Why & Progress' },
  { id: 'latest', label: 'Latest' },
  { id: 'newsletter', label: 'Newsletter' },
];

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list];
  const j = index + dir;
  if (j < 0 || j >= next.length) return list;
  const tmp = next[index]!;
  next[index] = next[j]!;
  next[j] = tmp;
  return next;
}

export default function AdminHomepagePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('hero');
  const [payload, setPayload] = useState<HomepagePayload>(createDefaultHomepagePayload);
  const [heroImageAssetId, setHeroImageAssetId] = useState<string | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const adminQ = useQuery({
    queryKey: ['admin-homepage'],
    queryFn: getAdminHomepage,
  });

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
    staleTime: 60_000,
  });

  const storageQ = useQuery({
    queryKey: ['storage-status'],
    queryFn: getStorageStatus,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!adminQ.data) return;
    setPayload(adminQ.data.draft.payload);
    setHeroImageAssetId(adminQ.data.draft.heroImageAssetId);
    setHeroPreviewUrl(adminQ.data.draft.heroImageUrl);
    setDirty(false);
  }, [adminQ.data]);

  const publishedAt = adminQ.data?.published.publishedAt;

  const flatCategories = useMemo(() => {
    const roots = categoriesQ.data ?? [];
    return roots.map((r) => ({
      id: r.id,
      name: r.name,
      children: r.children.map((c) => ({ id: c.id, name: c.name })),
    }));
  }, [categoriesQ.data]);

  const patch = (updater: (prev: HomepagePayload) => HomepagePayload) => {
    setPayload((prev) => updater(prev));
    setDirty(true);
    setMessage(null);
  };

  const save = useMutation({
    mutationFn: () => saveHomepageDraft({ payload, heroImageAssetId }),
    onSuccess: (draft) => {
      setPayload(draft.payload);
      setHeroImageAssetId(draft.heroImageAssetId);
      setHeroPreviewUrl(draft.heroImageUrl);
      setDirty(false);
      setMessage({ tone: 'success', text: 'Draft saved. Public site unchanged until you publish.' });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err: Error) => setMessage({ tone: 'danger', text: err.message }),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (dirty) await saveHomepageDraft({ payload, heroImageAssetId });
      return publishHomepage();
    },
    onSuccess: () => {
      setDirty(false);
      setConfirmPublish(false);
      setMessage({ tone: 'success', text: 'Published. Homepage will refresh within ~60s.' });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err: Error) => {
      setConfirmPublish(false);
      setMessage({ tone: 'danger', text: err.message });
    },
  });

  const restore = useMutation({
    mutationFn: restoreHomepage,
    onSuccess: (draft) => {
      setPayload(draft.payload);
      setHeroImageAssetId(draft.heroImageAssetId);
      setHeroPreviewUrl(draft.heroImageUrl);
      setDirty(false);
      setConfirmRestore(false);
      setMessage({ tone: 'success', text: 'Draft restored from the live published homepage.' });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err: Error) => {
      setConfirmRestore(false);
      setMessage({ tone: 'danger', text: err.message });
    },
  });

  const uploadHero = useMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadViaSignedRequest('homepage-hero', file);
      return asset;
    },
    onSuccess: (asset) => {
      setHeroImageAssetId(asset.id);
      setHeroPreviewUrl(null);
      setDirty(true);
      setMessage({
        tone: 'success',
        text: 'Hero image uploaded. Save draft, then publish to go live.',
      });
    },
    onError: (err: Error) => setMessage({ tone: 'danger', text: err.message }),
  });

  if (adminQ.isLoading) {
    return (
      <AdminPage>
        <PageHeader title="Homepage Management" description="Loading…" />
        <p className="text-sm text-[var(--muted)]">Loading homepage CMS…</p>
      </AdminPage>
    );
  }

  if (adminQ.isError) {
    return (
      <AdminPage>
        <PageHeader title="Homepage Management" description="Could not load" />
        <Alert variant="danger">Could not load homepage content. Try again.</Alert>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title="Homepage Management"
        description="Edit draft homepage content, then publish to update the live marketing site."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className="size-4" />
              Save draft
            </Button>
            <Button
              type="button"
              disabled={publish.isPending}
              onClick={() => setConfirmPublish(true)}
            >
              <Eye className="size-4" />
              Publish
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={restore.isPending}
              onClick={() => setConfirmRestore(true)}
            >
              <RotateCcw className="size-4" />
              Restore published
            </Button>
          </div>
        }
      />
      {message ? <Alert variant={message.tone}>{message.text}</Alert> : null}
      <p className="text-xs text-[var(--muted-strong)]">
        {dirty ? 'Unsaved draft changes.' : 'Draft matches last save.'}
        {publishedAt
          ? ` · Live published ${new Date(publishedAt).toLocaleString()}`
          : ' · Not yet published'}
      </p>

      <div className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'bg-[var(--bg-muted)] text-[var(--ink-soft)] hover:bg-[var(--bg-soft)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Surface className="space-y-5 p-5">
        {tab === 'hero' ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={payload.hero.visible}
                onChange={(e) =>
                  patch((p) => ({ ...p, hero: { ...p.hero, visible: e.target.checked } }))
                }
              />
              Show hero section
            </label>
            <Field label="Eyebrow">
              <Input
                value={payload.hero.eyebrow}
                onChange={(e) =>
                  patch((p) => ({ ...p, hero: { ...p.hero, eyebrow: e.target.value } }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Title before highlight">
                <Input
                  value={payload.hero.titleBefore}
                  onChange={(e) =>
                    patch((p) => ({ ...p, hero: { ...p.hero, titleBefore: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Highlighted words">
                <Input
                  value={payload.hero.titleHighlight}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      hero: { ...p.hero, titleHighlight: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Title after">
                <Input
                  value={payload.hero.titleAfter ?? ''}
                  onChange={(e) =>
                    patch((p) => ({ ...p, hero: { ...p.hero, titleAfter: e.target.value } }))
                  }
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={payload.hero.description}
                onChange={(e) =>
                  patch((p) => ({ ...p, hero: { ...p.hero, description: e.target.value } }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <CtaFields
                title="Primary CTA"
                cta={payload.hero.primaryCta}
                onChange={(cta) => patch((p) => ({ ...p, hero: { ...p.hero, primaryCta: cta } }))}
              />
              <CtaFields
                title="Secondary CTA"
                cta={payload.hero.secondaryCta}
                onChange={(cta) =>
                  patch((p) => ({ ...p, hero: { ...p.hero, secondaryCta: cta } }))
                }
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Hero stats</p>
              {payload.hero.stats.map((stat, i) => (
                <div key={i} className="grid gap-2 rounded-[var(--radius)] border border-[var(--line)] p-3 sm:grid-cols-4">
                  <Select
                    value={stat.iconKey}
                    onChange={(e) =>
                      patch((p) => {
                        const stats = [...p.hero.stats];
                        stats[i] = {
                          ...stats[i]!,
                          iconKey: e.target.value as HomepagePayload['hero']['stats'][number]['iconKey'],
                        };
                        return { ...p, hero: { ...p.hero, stats } };
                      })
                    }
                  >
                    {HOMEPAGE_ICON_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={stat.value}
                    placeholder="Value"
                    onChange={(e) =>
                      patch((p) => {
                        const stats = [...p.hero.stats];
                        stats[i] = { ...stats[i]!, value: e.target.value };
                        return { ...p, hero: { ...p.hero, stats } };
                      })
                    }
                  />
                  <Input
                    value={stat.label}
                    placeholder="Label"
                    onChange={(e) =>
                      patch((p) => {
                        const stats = [...p.hero.stats];
                        stats[i] = { ...stats[i]!, label: e.target.value };
                        return { ...p, hero: { ...p.hero, stats } };
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch((p) => ({
                        ...p,
                        hero: { ...p.hero, stats: p.hero.stats.filter((_, j) => j !== i) },
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patch((p) => ({
                    ...p,
                    hero: {
                      ...p.hero,
                      stats: [
                        ...p.hero.stats,
                        { iconKey: 'users', value: '0', label: 'New stat' },
                      ],
                    },
                  }))
                }
              >
                <Plus className="size-4" /> Add stat
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Hero image</p>
              {heroPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroPreviewUrl}
                  alt="Hero preview"
                  className="h-40 w-full max-w-md rounded-[var(--radius)] object-cover"
                />
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  {heroImageAssetId
                    ? `Asset ${heroImageAssetId.slice(0, 8)}… (preview after save)`
                    : 'Using default /images/hero-students.jpg until you upload.'}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-[var(--line)] px-3 py-2 text-sm font-medium">
                  <Upload className="size-4" />
                  Upload image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={!storageQ.data?.configured || uploadHero.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadHero.mutate(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHeroImageAssetId(null);
                    setHeroPreviewUrl(null);
                    setDirty(true);
                  }}
                >
                  Clear image
                </Button>
              </div>
              {!storageQ.data?.configured ? (
                <p className="text-xs text-[var(--warning-fg)]">
                  Cloudinary is not configured — image upload unavailable.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'categories' ? (
          <CategoryTilesEditor
            section={payload.categories}
            flatCategories={flatCategories}
            onChange={(categories) => patch((p) => ({ ...p, categories }))}
          />
        ) : null}

        {tab === 'topics' ? (
          <TopicTilesEditor
            section={payload.topics}
            flatCategories={flatCategories}
            onChange={(topics) => patch((p) => ({ ...p, topics }))}
          />
        ) : null}

        {tab === 'mid' ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={payload.why.visible}
                  onChange={(e) =>
                    patch((p) => ({ ...p, why: { ...p.why, visible: e.target.checked } }))
                  }
                />
                Show Why section
              </label>
              <Field label="Why heading">
                <Input
                  value={payload.why.heading}
                  onChange={(e) =>
                    patch((p) => ({ ...p, why: { ...p.why, heading: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Points (one per line)">
                <Textarea
                  value={payload.why.points.join('\n')}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      why: {
                        ...p.why,
                        points: e.target.value
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                />
              </Field>
            </div>
            <div className="space-y-3 border-t border-[var(--line)] pt-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={payload.progress.visible}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      progress: { ...p.progress, visible: e.target.checked },
                    }))
                  }
                />
                Show Progress section
              </label>
              <Field label="Progress heading">
                <Input
                  value={payload.progress.heading}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      progress: { ...p.progress, heading: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Trend caption">
                <Input
                  value={payload.progress.trendCaption}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      progress: { ...p.progress, trendCaption: e.target.value },
                    }))
                  }
                />
              </Field>
              {payload.progress.metrics.map((m, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-4">
                  <Input
                    value={m.value}
                    onChange={(e) =>
                      patch((p) => {
                        const metrics = [...p.progress.metrics];
                        metrics[i] = { ...metrics[i]!, value: e.target.value };
                        return { ...p, progress: { ...p.progress, metrics } };
                      })
                    }
                  />
                  <Input
                    value={m.label}
                    onChange={(e) =>
                      patch((p) => {
                        const metrics = [...p.progress.metrics];
                        metrics[i] = { ...metrics[i]!, label: e.target.value };
                        return { ...p, progress: { ...p.progress, metrics } };
                      })
                    }
                  />
                  <Select
                    value={m.tone}
                    onChange={(e) =>
                      patch((p) => {
                        const metrics = [...p.progress.metrics];
                        metrics[i] = {
                          ...metrics[i]!,
                          tone: e.target.value as 'info' | 'success' | 'danger' | 'insight',
                        };
                        return { ...p, progress: { ...p.progress, metrics } };
                      })
                    }
                  >
                    <option value="info">info</option>
                    <option value="success">success</option>
                    <option value="danger">danger</option>
                    <option value="insight">insight</option>
                  </Select>
                  <Select
                    value={m.iconKey}
                    onChange={(e) =>
                      patch((p) => {
                        const metrics = [...p.progress.metrics];
                        metrics[i] = {
                          ...metrics[i]!,
                          iconKey: e.target.value as HomepagePayload['progress']['metrics'][number]['iconKey'],
                        };
                        return { ...p, progress: { ...p.progress, metrics } };
                      })
                    }
                  >
                    {HOMEPAGE_ICON_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-[var(--line)] pt-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={payload.ctaBanner.visible}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      ctaBanner: { ...p.ctaBanner, visible: e.target.checked },
                    }))
                  }
                />
                Show CTA banner
              </label>
              <Field label="CTA heading">
                <Input
                  value={payload.ctaBanner.heading}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      ctaBanner: { ...p.ctaBanner, heading: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="CTA body">
                <Textarea
                  value={payload.ctaBanner.body}
                  onChange={(e) =>
                    patch((p) => ({
                      ...p,
                      ctaBanner: { ...p.ctaBanner, body: e.target.value },
                    }))
                  }
                />
              </Field>
              <CtaFields
                title="Banner button"
                cta={payload.ctaBanner.cta}
                onChange={(cta) =>
                  patch((p) => ({ ...p, ctaBanner: { ...p.ctaBanner, cta } }))
                }
              />
            </div>
          </div>
        ) : null}

        {tab === 'latest' ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={payload.latest.visible}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    latest: { ...p.latest, visible: e.target.checked },
                  }))
                }
              />
              Show Latest Collections
            </label>
            <Field label="Heading">
              <Input
                value={payload.latest.heading}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    latest: { ...p.latest, heading: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Subtitle">
              <Input
                value={payload.latest.subtitle}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    latest: { ...p.latest, subtitle: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="List limit (1–20)">
              <Input
                type="number"
                min={1}
                max={20}
                value={payload.latest.limit}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    latest: {
                      ...p.latest,
                      limit: Math.min(20, Math.max(1, Number(e.target.value) || 6)),
                    },
                  }))
                }
              />
            </Field>
            <CtaFields
              title="Section CTA"
              cta={payload.latest.cta}
              onChange={(cta) => patch((p) => ({ ...p, latest: { ...p.latest, cta } }))}
            />
          </div>
        ) : null}

        {tab === 'newsletter' ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={payload.newsletter.visible}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    newsletter: { ...p.newsletter, visible: e.target.checked },
                  }))
                }
              />
              Show newsletter strip
            </label>
            <Field label="Title">
              <Input
                value={payload.newsletter.title}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    newsletter: { ...p.newsletter, title: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="Body">
              <Textarea
                value={payload.newsletter.body}
                onChange={(e) =>
                  patch((p) => ({
                    ...p,
                    newsletter: { ...p.newsletter, body: e.target.value },
                  }))
                }
              />
            </Field>
            <CtaFields
              title="CTA"
              cta={payload.newsletter.cta}
              onChange={(cta) =>
                patch((p) => ({ ...p, newsletter: { ...p.newsletter, cta } }))
              }
            />
          </div>
        ) : null}
      </Surface>

      <Surface className="overflow-hidden p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm font-semibold"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-expanded={previewOpen}
        >
          <span>Draft preview</span>
          <span className="text-xs font-medium text-[var(--muted-strong)]">
            {previewOpen ? 'Hide' : 'Show'} · unsaved edits included
          </span>
        </button>
        {previewOpen ? (
          <div className="max-h-[70vh] overflow-auto border-t border-[var(--line)] bg-[var(--bg-desk)] lg:max-h-none">
            <div className="origin-top scale-[0.92] sm:scale-100">
              <HomepageHero hero={payload.hero} heroImageUrl={heroPreviewUrl} />
              <HomepageBankBrowse categories={payload.categories} topics={payload.topics} />
              <HomepageMidSections
                why={payload.why}
                progress={payload.progress}
                ctaBanner={payload.ctaBanner}
              />
              <HomepageLatestQuestions latest={payload.latest} />
              <div className="mx-auto max-w-[1280px] px-4 pb-8 sm:px-6">
                <NewsletterBar newsletter={payload.newsletter} />
              </div>
            </div>
          </div>
        ) : null}
      </Surface>

      <ConfirmDialog
        open={confirmPublish}
        title="Publish homepage?"
        description="The live marketing homepage will be replaced with the current draft (after auto-saving unsaved changes)."
        confirmLabel="Publish"
        onConfirm={() => publish.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />
      <ConfirmDialog
        open={confirmRestore}
        title="Restore published into draft?"
        description="Unsaved draft edits will be lost. The draft will match the currently live homepage."
        confirmLabel="Restore"
        onConfirm={() => restore.mutate()}
        onCancel={() => setConfirmRestore(false)}
      />
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CtaFields({
  title,
  cta,
  onChange,
}: {
  title: string;
  cta: HomepagePayload['hero']['primaryCta'];
  onChange: (cta: HomepagePayload['hero']['primaryCta']) => void;
}) {
  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] p-3">
      <p className="text-sm font-semibold">{title}</p>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={cta.visible}
          onChange={(e) => onChange({ ...cta, visible: e.target.checked })}
        />
        Visible
      </label>
      <Input
        value={cta.label}
        placeholder="Label"
        onChange={(e) => onChange({ ...cta, label: e.target.value })}
      />
      <Input
        value={cta.href}
        placeholder="/path or https://…"
        onChange={(e) => onChange({ ...cta, href: e.target.value })}
      />
    </div>
  );
}

type FlatCat = Array<{
  id: string;
  name: string;
  children: Array<{ id: string; name: string }>;
}>;

function CategoryTilesEditor({
  section,
  flatCategories,
  onChange,
}: {
  section: HomepagePayload['categories'];
  flatCategories: FlatCat;
  onChange: (next: HomepagePayload['categories']) => void;
}) {
  const tiles = section.tiles;
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={section.visible}
          onChange={(e) => onChange({ ...section, visible: e.target.checked })}
        />
        Show section
      </label>
      <Field label="Heading">
        <Input
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
        />
      </Field>
      <Field label="Subtitle">
        <Input
          value={section.subtitle}
          onChange={(e) => onChange({ ...section, subtitle: e.target.value })}
        />
      </Field>
      <CtaFields
        title="Section CTA"
        cta={section.cta}
        onChange={(cta) => onChange({ ...section, cta })}
      />
      <div className="space-y-3">
        <p className="text-sm font-semibold">Tiles</p>
        {tiles.map((tile, i) => (
          <div
            key={tile.id}
            className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...section, tiles: moveItem(tiles, i, -1) })}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...section, tiles: moveItem(tiles, i, 1) })}
              >
                <ArrowDown className="size-4" />
              </Button>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={tile.visible}
                  onChange={(e) => {
                    const next = [...tiles];
                    next[i] = { ...tile, visible: e.target.checked };
                    onChange({ ...section, tiles: next });
                  }}
                />
                Visible
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange({ ...section, tiles: tiles.filter((_, j) => j !== i) })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Input
              value={tile.displayTitle}
              placeholder="Title"
              onChange={(e) => {
                const next = [...tiles];
                next[i] = { ...tile, displayTitle: e.target.value };
                onChange({ ...section, tiles: next });
              }}
            />
            <Input
              value={tile.subtitle ?? ''}
              placeholder="Subtitle"
              onChange={(e) => {
                const next = [...tiles];
                next[i] = { ...tile, subtitle: e.target.value };
                onChange({ ...section, tiles: next });
              }}
            />
            <Select
              value={tile.iconKey}
              onChange={(e) => {
                const next = [...tiles];
                next[i] = {
                  ...tile,
                  iconKey: e.target.value as (typeof HOMEPAGE_ICON_KEYS)[number],
                };
                onChange({ ...section, tiles: next });
              }}
            >
              {HOMEPAGE_ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
            <Select
              value={tile.categoryId ?? ''}
              onChange={(e) => {
                const next = [...tiles];
                next[i] = { ...tile, categoryId: e.target.value || null };
                onChange({ ...section, tiles: next });
              }}
            >
              <option value="">No linked category (use fallback URL)</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input
              value={tile.fallbackHref}
              placeholder="Fallback href"
              onChange={(e) => {
                const next = [...tiles];
                next[i] = { ...tile, fallbackHref: e.target.value };
                onChange({ ...section, tiles: next });
              }}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              tiles: [
                ...tiles,
                {
                  id: `category-${Date.now()}`,
                  displayTitle: 'New category',
                  subtitle: '',
                  iconKey: 'gear',
                  categoryId: null,
                  fallbackHref: '/preli-question-bank',
                  visible: true,
                },
              ],
            })
          }
        >
          <Plus className="size-4" /> Add tile
        </Button>
      </div>
    </div>
  );
}

function TopicTilesEditor({
  section,
  flatCategories,
  onChange,
}: {
  section: HomepagePayload['topics'];
  flatCategories: FlatCat;
  onChange: (next: HomepagePayload['topics']) => void;
}) {
  const tiles = section.tiles;
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={section.visible}
          onChange={(e) => onChange({ ...section, visible: e.target.checked })}
        />
        Show section
      </label>
      <Field label="Heading">
        <Input
          value={section.heading}
          onChange={(e) => onChange({ ...section, heading: e.target.value })}
        />
      </Field>
      <CtaFields
        title="Section CTA"
        cta={section.cta}
        onChange={(cta) => onChange({ ...section, cta })}
      />
      <div className="space-y-3">
        <p className="text-sm font-semibold">Tiles</p>
        {tiles.map((tile, i) => (
          <div
            key={tile.id}
            className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...section, tiles: moveItem(tiles, i, -1) })}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange({ ...section, tiles: moveItem(tiles, i, 1) })}
              >
                <ArrowDown className="size-4" />
              </Button>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={tile.visible}
                  onChange={(e) => {
                    const next = [...tiles];
                    next[i] = { ...tile, visible: e.target.checked };
                    onChange({ ...section, tiles: next });
                  }}
                />
                Visible
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange({ ...section, tiles: tiles.filter((_, j) => j !== i) })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Input
              value={tile.displayTitle}
              placeholder="Title"
              onChange={(e) => {
                const next = [...tiles];
                next[i] = { ...tile, displayTitle: e.target.value };
                onChange({ ...section, tiles: next });
              }}
            />
            <Select
              value={tile.iconKey}
              onChange={(e) => {
                const next = [...tiles];
                next[i] = {
                  ...tile,
                  iconKey: e.target.value as (typeof HOMEPAGE_ICON_KEYS)[number],
                };
                onChange({ ...section, tiles: next });
              }}
            >
              {HOMEPAGE_ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
            <Select
              value={tile.categoryId ?? ''}
              onChange={(e) => {
                const next = [...tiles];
                next[i] = {
                  ...tile,
                  categoryId: e.target.value || null,
                  subcategoryId: null,
                };
                onChange({ ...section, tiles: next });
              }}
            >
              <option value="">No linked category (use fallback URL)</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select
              value={tile.subcategoryId ?? ''}
              onChange={(e) => {
                const next = [...tiles];
                next[i] = { ...tile, subcategoryId: e.target.value || null };
                onChange({ ...section, tiles: next });
              }}
            >
              <option value="">No subcategory</option>
              {flatCategories
                .find((c) => c.id === tile.categoryId)
                ?.children.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
            <Input
              value={tile.fallbackHref}
              placeholder="Fallback href"
              onChange={(e) => {
                const next = [...tiles];
                next[i] = { ...tile, fallbackHref: e.target.value };
                onChange({ ...section, tiles: next });
              }}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...section,
              tiles: [
                ...tiles,
                {
                  id: `topic-${Date.now()}`,
                  displayTitle: 'New topic',
                  iconKey: 'gear',
                  categoryId: null,
                  subcategoryId: null,
                  fallbackHref: '/preli-question-bank',
                  visible: true,
                },
              ],
            })
          }
        >
          <Plus className="size-4" /> Add tile
        </Button>
      </div>
    </div>
  );
}
