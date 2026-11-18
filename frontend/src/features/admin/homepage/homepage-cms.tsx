'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HOMEPAGE_SECTION_LABELS,
  createDefaultHomepagePayload,
  isCustomLayoutSectionId,
  normalizeHomepagePayload,
  toCustomLayoutId,
  type HomepagePayload,
} from '@your-academy/shared';
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CmsImagePreview } from '@/components/admin/cms-image-preview';
import { AdminFormPanel, AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Reveal } from '@/components/motion/reveal';
import { Stagger } from '@/components/motion/stagger';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getAdminHomepage,
  listHomepageRevisions,
  publishHomepage,
  restoreHomepage,
  restoreHomepageRevision,
  saveHomepageDraft,
} from '@/lib/api/homepage';
import {
  assertHomepageHeroFile,
  getStorageStatus,
  uploadViaSignedRequest,
} from '@/lib/cloudinary-upload';
import { cn } from '@/lib/utils';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

function newCustomId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sectionLabel(id: string, payload?: HomepagePayload): string {
  if (isCustomLayoutSectionId(id)) {
    const customId = id.slice('custom:'.length);
    const heading = payload?.customSections.find((c) => c.id === customId)?.heading;
    return heading?.trim() ? heading.trim() : 'Custom section';
  }
  return HOMEPAGE_SECTION_LABELS[id as keyof typeof HOMEPAGE_SECTION_LABELS] ?? id;
}

/**
 * Full homepage CMS: reorder sections, edit content, draft/preview/publish, revisions.
 */
export function HomepageCms() {
  const qc = useQueryClient();
  const [payload, setPayload] = useState<HomepagePayload>(createDefaultHomepagePayload);
  const [heroImageAssetId, setHeroImageAssetId] = useState<string | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string>('hero');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmDeleteCustom, setConfirmDeleteCustom] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const heroObjectUrlRef = useRef<string | null>(null);

  const revokeHeroObjectUrl = () => {
    if (heroObjectUrlRef.current) {
      URL.revokeObjectURL(heroObjectUrlRef.current);
      heroObjectUrlRef.current = null;
    }
  };

  const setHeroPreview = (url: string | null, isObjectUrl = false) => {
    revokeHeroObjectUrl();
    if (isObjectUrl && url) heroObjectUrlRef.current = url;
    setHeroPreviewUrl(url);
  };

  const adminQ = useQuery({
    queryKey: ['admin-homepage'],
    queryFn: getAdminHomepage,
  });
  const revisionsQ = useQuery({
    queryKey: ['admin-homepage-revisions'],
    queryFn: () => listHomepageRevisions(20),
  });
  const storageQ = useQuery({
    queryKey: ['storage-status'],
    queryFn: getStorageStatus,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!adminQ.data) return;
    setPayload(normalizeHomepagePayload(adminQ.data.draft.payload));
    setHeroImageAssetId(adminQ.data.draft.heroImageAssetId);
    setHeroPreview(adminQ.data.draft.heroImageUrl);
    setDirty(false);
  }, [adminQ.data]);

  useEffect(() => () => revokeHeroObjectUrl(), []);

  const sections = payload.layout.sections;
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0];

  const patch = (updater: (prev: HomepagePayload) => HomepagePayload) => {
    setPayload((prev) => normalizeHomepagePayload(updater(prev)));
    setDirty(true);
    setMessage(null);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) {
      return;
    }
    patch((prev) => {
      const next = [...prev.layout.sections];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return { ...prev, layout: { sections: next } };
    });
  };

  const toggleVisible = (id: string) => {
    patch((prev) => ({
      ...prev,
      layout: {
        sections: prev.layout.sections.map((s) =>
          s.id === id ? { ...s, visible: !s.visible } : s,
        ),
      },
    }));
  };

  const addCustom = () => {
    const id = newCustomId();
    patch((prev) => ({
      ...prev,
      customSections: [
        ...prev.customSections,
        {
          id,
          heading: 'New section',
          body: 'Describe this block for learners.',
          cta: { label: 'Learn more', href: '/register', visible: true },
          visible: true,
        },
      ],
      layout: {
        sections: [
          ...prev.layout.sections,
          { id: toCustomLayoutId(id), visible: true },
        ],
      },
    }));
    setSelectedId(toCustomLayoutId(id));
  };

  const removeCustom = (layoutId: string) => {
    if (!isCustomLayoutSectionId(layoutId)) return;
    const customId = layoutId.slice('custom:'.length);
    patch((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((c) => c.id !== customId),
      layout: {
        sections: prev.layout.sections.filter((s) => s.id !== layoutId),
      },
    }));
    setSelectedId('hero');
    setConfirmDeleteCustom(false);
  };

  const duplicateCustom = (layoutId: string) => {
    if (!isCustomLayoutSectionId(layoutId)) return;
    const sourceId = layoutId.slice('custom:'.length);
    const source = payload.customSections.find((c) => c.id === sourceId);
    if (!source) return;
    const id = newCustomId();
    const layoutEntry = { id: toCustomLayoutId(id), visible: true };
    patch((prev) => {
      const idx = prev.layout.sections.findIndex((s) => s.id === layoutId);
      const sections = [...prev.layout.sections];
      sections.splice(idx >= 0 ? idx + 1 : sections.length, 0, layoutEntry);
      return {
        ...prev,
        customSections: [
          ...prev.customSections,
          {
            ...source,
            id,
            heading: `${source.heading} (copy)`,
          },
        ],
        layout: { sections },
      };
    });
    setSelectedId(toCustomLayoutId(id));
  };

  const save = useMutation({
    mutationFn: () =>
      saveHomepageDraft({
        payload: normalizeHomepagePayload(payload),
        heroImageAssetId,
      }),
    onSuccess: (draft) => {
      setPayload(normalizeHomepagePayload(draft.payload));
      setHeroImageAssetId(draft.heroImageAssetId);
      setHeroPreview(draft.heroImageUrl);
      setDirty(false);
      setMessage({
        tone: 'success',
        text: 'Draft saved. Public site unchanged until you publish.',
      });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err: Error) => setMessage({ tone: 'danger', text: err.message }),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (dirty) {
        await saveHomepageDraft({
          payload: normalizeHomepagePayload(payload),
          heroImageAssetId,
        });
      }
      return publishHomepage();
    },
    onSuccess: () => {
      setDirty(false);
      setConfirmPublish(false);
      setMessage({
        tone: 'success',
        text: 'Published. Live homepage refreshes within ~60s.',
      });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
      void qc.invalidateQueries({ queryKey: ['admin-homepage-revisions'] });
    },
    onError: (err: Error) => {
      setConfirmPublish(false);
      setMessage({ tone: 'danger', text: err.message });
    },
  });

  const restore = useMutation({
    mutationFn: restoreHomepage,
    onSuccess: (draft) => {
      setPayload(normalizeHomepagePayload(draft.payload));
      setHeroImageAssetId(draft.heroImageAssetId);
      setHeroPreview(draft.heroImageUrl);
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

  const restoreRevision = useMutation({
    mutationFn: (id: string) => restoreHomepageRevision(id),
    onSuccess: (draft) => {
      setPayload(normalizeHomepagePayload(draft.payload));
      setHeroImageAssetId(draft.heroImageAssetId);
      setHeroPreview(draft.heroImageUrl);
      setDirty(true);
      setMessage({
        tone: 'success',
        text: 'Revision loaded into draft. Save or publish when ready.',
      });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err: Error) => setMessage({ tone: 'danger', text: err.message }),
  });

  const uploadHero = useMutation({
    mutationFn: async (file: File) => {
      assertHomepageHeroFile(file);
      const localUrl = URL.createObjectURL(file);
      setHeroPreview(localUrl, true);
      return uploadViaSignedRequest('homepage-hero', file);
    },
    onSuccess: (asset) => {
      setHeroImageAssetId(asset.id);
      setDirty(true);
      setMessage({
        tone: 'success',
        text: 'Hero image uploaded. Save draft, then publish to go live.',
      });
    },
    onError: (err: Error) => setMessage({ tone: 'danger', text: err.message }),
  });

  const visibleCount = useMemo(
    () => sections.filter((s) => s.visible).length,
    [sections],
  );

  if (adminQ.isLoading) {
    return (
      <AdminPage>
        <PageHeader title="Homepage CMS" description="Loading…" />
        <div className="space-y-3" role="status" aria-busy="true">
          <div className="h-24 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
          <div className="h-40 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
        </div>
      </AdminPage>
    );
  }

  if (adminQ.isError) {
    return (
      <AdminPage>
        <PageHeader title="Homepage CMS" description="Could not load" />
        <Alert variant="danger">Could not load homepage content.</Alert>
      </AdminPage>
    );
  }

  return (
    <AdminPage dense>
      <Reveal>
        <PageHeader
          eyebrow="Marketing"
          title="Homepage CMS"
          description="Reorder every homepage section, edit text/images/buttons, save drafts, preview, and publish. Live site only shows published content."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="motion-press"
                onClick={() => setPreviewOpen((v) => !v)}
              >
                <Eye className="size-4" />
                {previewOpen ? 'Hide preview' : 'Preview draft'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="motion-press"
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate()}
              >
                <Save className="size-4" />
                Save draft
              </Button>
              <Button
                type="button"
                size="sm"
                className="motion-press"
                disabled={publish.isPending}
                onClick={() => setConfirmPublish(true)}
              >
                <Upload className="size-4" />
                Publish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={restore.isPending}
                onClick={() => setConfirmRestore(true)}
              >
                <RotateCcw className="size-4" />
                Restore live
              </Button>
            </div>
          }
        />
      </Reveal>

      {message ? (
        <Alert variant={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
      ) : null}
      {dirty ? <Alert variant="warning">Unpublished draft changes.</Alert> : null}

      <p className="text-xs text-[var(--muted)]">
        {visibleCount}/{sections.length} sections visible
        {adminQ.data?.published.publishedAt
          ? ` · Live published ${new Date(adminQ.data.published.publishedAt).toLocaleString()}`
          : ' · Not yet published'}
        {' · '}
        <Link className="underline-offset-2 hover:underline" href="/admin/question-bank-categories">
          Category tiles
        </Link>
        {' · '}
        <Link className="underline-offset-2 hover:underline" href="/admin/topic-categories">
          Topic tiles
        </Link>
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <Reveal delayMs={40}>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-[var(--ink)]">Section order</h2>
              <Button type="button" size="sm" variant="outline" onClick={addCustom}>
                <Plus className="size-3.5" />
                Custom
              </Button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Drag to reorder. Use the eye icon or the editor checkbox to show/hide sections.
            </p>
            <Stagger
              stepMs={30}
              className="space-y-1.5"
              role="list"
              aria-label="Homepage sections"
            >
              {sections.map((entry, index) => (
                <div
                  key={entry.id}
                  role="listitem"
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null) return;
                    reorder(dragIndex, index);
                    setDragIndex(null);
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-[var(--radius)] border px-2.5 py-2 transition-colors',
                    selectedId === entry.id
                      ? 'border-[var(--highlight)]/50 bg-[var(--info-soft)]'
                      : 'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--highlight)]/30',
                    !entry.visible && 'opacity-60',
                  )}
                >
                  <GripVertical className="size-3.5 shrink-0 cursor-grab text-[var(--muted)]" />
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer text-left text-sm font-medium text-[var(--ink)]"
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <span className="mr-1.5 tabular-nums text-[var(--muted)]">{index + 1}.</span>
                    {sectionLabel(entry.id, payload)}
                  </button>
                  {!entry.visible ? <Badge variant="outline">Hidden</Badge> : null}
                  {isCustomLayoutSectionId(entry.id) ? (
                    <button
                      type="button"
                      className="cursor-pointer text-[var(--muted)] hover:text-[var(--ink)]"
                      title="Duplicate section"
                      onClick={() => duplicateCustom(entry.id)}
                    >
                      <Copy className="size-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cursor-pointer text-[var(--muted)] hover:text-[var(--ink)]"
                    title={entry.visible ? 'Hide section' : 'Show section'}
                    onClick={() => toggleVisible(entry.id)}
                  >
                    {entry.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                </div>
              ))}
            </Stagger>

            <div className="space-y-2 pt-4">
              <h3 className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                Revisions
              </h3>
              {(revisionsQ.data ?? []).length === 0 ? (
                <p className="text-xs text-[var(--muted)]">No snapshots yet. Publish to create one.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                  {(revisionsQ.data ?? []).map((rev) => (
                    <li
                      key={rev.id}
                      className="flex items-center justify-between gap-2 rounded border border-[var(--line)] px-2 py-1.5"
                    >
                      <span className="min-w-0 truncate text-[var(--muted)]">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        disabled={restoreRevision.isPending}
                        onClick={() => restoreRevision.mutate(rev.id)}
                      >
                        Load
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </Reveal>

        <Reveal delayMs={70}>
          <AdminFormPanel
            title={selected ? `Edit · ${sectionLabel(selected.id, payload)}` : 'Select a section'}
            description="Changes apply to the draft. Publish to update the live homepage."
          >
            {selected ? (
              <div className="space-y-4">
                <SectionVisibilityToggle
                  checked={selected.visible}
                  onChange={() => toggleVisible(selected.id)}
                />
                <SectionEditor
                  sectionId={selected.id}
                  payload={payload}
                  heroPreviewUrl={heroPreviewUrl}
                  storageConfigured={Boolean(storageQ.data?.configured)}
                  uploadingHero={uploadHero.isPending}
                  onPatch={patch}
                  onUploadHero={(file) => uploadHero.mutate(file)}
                  onClearHero={() => {
                    setHeroImageAssetId(null);
                    setHeroPreview(null);
                    setDirty(true);
                  }}
                  onRequestRemoveCustom={() => setConfirmDeleteCustom(true)}
                  onDuplicateCustom={() => duplicateCustom(selected.id)}
                />
              </div>
            ) : null}
          </AdminFormPanel>
        </Reveal>
      </div>

      {previewOpen ? (
        <Reveal delayMs={20}>
          <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-muted)]/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-[var(--ink)]">
                Draft layout preview
              </h2>
              <div className="flex gap-1">
                {(
                  [
                    { id: 'desktop' as const, icon: Monitor, label: 'Desktop' },
                    { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
                    { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
                  ] as const
                ).map(({ id, icon: Icon, label }) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant={previewDevice === id ? 'secondary' : 'ghost'}
                    className="h-8 px-2"
                    title={label}
                    onClick={() => setPreviewDevice(id)}
                  >
                    <Icon className="size-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">{label}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div
                className={cn(
                  'mx-auto space-y-2 rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] transition-[max-width]',
                  previewDevice === 'desktop' && 'max-w-4xl',
                  previewDevice === 'tablet' && 'max-w-md',
                  previewDevice === 'mobile' && 'max-w-[22rem]',
                )}
              >
                {sections
                  .filter((s) => s.visible)
                  .map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--bg-desk)] px-3 py-2.5 text-left text-sm hover:border-[var(--highlight)]/40"
                      onClick={() => setSelectedId(s.id)}
                    >
                      <span className="tabular-nums text-[var(--muted)]">{i + 1}</span>
                      <span className="font-medium text-[var(--ink)]">
                        {sectionLabel(s.id, payload)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Outline shows published order after you publish. Open{' '}
              <Link className="underline-offset-2 hover:underline" href="/" target="_blank">
                the live homepage
              </Link>{' '}
              to verify full rendering. Category/topic tiles stay on their dedicated admin pages.
            </p>
          </section>
        </Reveal>
      ) : null}

      <ConfirmDialog
        open={confirmPublish}
        title="Publish homepage?"
        description="The live marketing homepage will update to this draft. A revision snapshot of the previous live version is saved automatically."
        confirmLabel="Publish now"
        onConfirm={() => publish.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />
      <ConfirmDialog
        open={confirmRestore}
        title="Restore published into draft?"
        description="Unsaved draft edits will be discarded and replaced with the current live homepage."
        confirmLabel="Restore"
        destructive
        onConfirm={() => restore.mutate()}
        onCancel={() => setConfirmRestore(false)}
      />
      <ConfirmDialog
        open={confirmDeleteCustom}
        title="Delete custom section?"
        description="This removes the custom block from the draft. Publish afterward to update the live homepage."
        confirmLabel="Delete"
        destructive
        onConfirm={() => selected && removeCustom(selected.id)}
        onCancel={() => setConfirmDeleteCustom(false)}
      />
    </AdminPage>
  );
}

function SectionVisibilityToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/40 px-3 py-2.5">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-[var(--highlight)]"
        checked={checked}
        onChange={onChange}
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-[var(--ink)]">
          Show this section on the homepage
        </span>
        <span className="block text-xs text-[var(--muted)]">
          Hidden sections stay in draft order but are omitted from the live site after publish.
        </span>
      </span>
    </label>
  );
}

function SectionEditor({
  sectionId,
  payload,
  heroPreviewUrl,
  storageConfigured,
  uploadingHero,
  onPatch,
  onUploadHero,
  onClearHero,
  onRequestRemoveCustom,
  onDuplicateCustom,
}: {
  sectionId: string;
  payload: HomepagePayload;
  heroPreviewUrl: string | null;
  storageConfigured: boolean;
  uploadingHero: boolean;
  onPatch: (updater: (prev: HomepagePayload) => HomepagePayload) => void;
  onUploadHero: (file: File) => void;
  onClearHero: () => void;
  onRequestRemoveCustom: () => void;
  onDuplicateCustom: () => void;
}) {
  if (sectionId === 'hero') {
    const h = payload.hero;
    return (
      <div className="space-y-4">
        <Field label="Eyebrow">
          <Input
            value={h.eyebrow}
            onChange={(e) =>
              onPatch((p) => ({ ...p, hero: { ...p.hero, eyebrow: e.target.value } }))
            }
          />
        </Field>
        <Field label="Main title (before highlight)">
          <Input
            value={h.titleBefore}
            onChange={(e) =>
              onPatch((p) => ({ ...p, hero: { ...p.hero, titleBefore: e.target.value } }))
            }
          />
        </Field>
        <Field label="Title highlight">
          <Input
            value={h.titleHighlight}
            onChange={(e) =>
              onPatch((p) => ({ ...p, hero: { ...p.hero, titleHighlight: e.target.value } }))
            }
          />
        </Field>
        <Field label="Title (after highlight)">
          <Input
            value={h.titleAfter ?? ''}
            onChange={(e) =>
              onPatch((p) => ({ ...p, hero: { ...p.hero, titleAfter: e.target.value } }))
            }
          />
        </Field>
        <Field label="Subtitle / description">
          <Textarea
            rows={3}
            value={h.description}
            onChange={(e) =>
              onPatch((p) => ({ ...p, hero: { ...p.hero, description: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Primary CTA"
          cta={h.primaryCta}
          onChange={(cta) => onPatch((p) => ({ ...p, hero: { ...p.hero, primaryCta: cta } }))}
        />
        <CtaFields
          label="Secondary CTA"
          cta={h.secondaryCta}
          onChange={(cta) => onPatch((p) => ({ ...p, hero: { ...p.hero, secondaryCta: cta } }))}
        />
        <div className="space-y-2">
          <Label>Hero image / banner</Label>
          <CmsImagePreview
            key={heroPreviewUrl ?? 'empty'}
            src={heroPreviewUrl}
            className="h-36 w-full sm:h-44"
            fit="cover"
            emptyLabel="No hero image selected"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[var(--highlight)]">
              {uploadingHero ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={!storageConfigured || uploadingHero}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) onUploadHero(file);
                }}
              />
            </label>
            <Button type="button" size="sm" variant="ghost" onClick={onClearHero}>
              Remove image
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            PNG, JPG, or WebP up to 8MB. Preview appears immediately; save draft, then publish to go
            live. Images are stored via signed Cloudinary upload (no public URL paste).
          </p>
          {!storageConfigured ? (
            <p className="text-xs text-[var(--danger)]">
              Cloudinary is not configured — hero upload is disabled.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (sectionId === 'categories' || sectionId === 'topics') {
    const block = sectionId === 'categories' ? payload.categories : payload.topics;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={block.heading}
            onChange={(e) =>
              onPatch((p) =>
                sectionId === 'categories'
                  ? { ...p, categories: { ...p.categories, heading: e.target.value } }
                  : { ...p, topics: { ...p.topics, heading: e.target.value } },
              )
            }
          />
        </Field>
        {sectionId === 'categories' ? (
          <Field label="Subtitle">
            <Input
              value={payload.categories.subtitle}
              onChange={(e) =>
                onPatch((p) => ({
                  ...p,
                  categories: { ...p.categories, subtitle: e.target.value },
                }))
              }
            />
          </Field>
        ) : (
          <Field label="Subtitle">
            <Textarea
              rows={3}
              value={payload.topics.subtitle ?? ''}
              onChange={(e) =>
                onPatch((p) => ({
                  ...p,
                  topics: { ...p.topics, subtitle: e.target.value, subheading: '' },
                }))
              }
            />
          </Field>
        )}
        <CtaFields
          label="Section CTA"
          cta={block.cta}
          onChange={(cta) =>
            onPatch((p) =>
              sectionId === 'categories'
                ? { ...p, categories: { ...p.categories, cta } }
                : { ...p, topics: { ...p.topics, cta } },
            )
          }
        />
        <Alert variant="warning">
          Tile logos, Top 4 order, and Others are managed on the dedicated{' '}
          {sectionId === 'categories' ? 'Question Bank Categories' : 'Topic'} page.
        </Alert>
      </div>
    );
  }

  if (sectionId === 'trialStrip') {
    const b = payload.trialStrip;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={b.heading}
            onChange={(e) =>
              onPatch((p) => ({ ...p, trialStrip: { ...p.trialStrip, heading: e.target.value } }))
            }
          />
        </Field>
        <Field label="Body">
          <Textarea
            rows={4}
            value={b.body}
            onChange={(e) =>
              onPatch((p) => ({ ...p, trialStrip: { ...p.trialStrip, body: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={b.cta}
          onChange={(cta) => onPatch((p) => ({ ...p, trialStrip: { ...p.trialStrip, cta } }))}
        />
      </div>
    );
  }

  if (sectionId === 'howItWorks') {
    const b = payload.howItWorks;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={b.heading}
            onChange={(e) =>
              onPatch((p) => ({ ...p, howItWorks: { ...p.howItWorks, heading: e.target.value } }))
            }
          />
        </Field>
        <Field label="Subtitle">
          <Input
            value={b.subtitle}
            onChange={(e) =>
              onPatch((p) => ({ ...p, howItWorks: { ...p.howItWorks, subtitle: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={b.cta}
          onChange={(cta) => onPatch((p) => ({ ...p, howItWorks: { ...p.howItWorks, cta } }))}
        />
        {b.steps.map((step, i) => (
          <div key={step.step} className="space-y-2 rounded border border-[var(--line)] p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Step {step.step}</p>
            <Input
              value={step.title}
              onChange={(e) =>
                onPatch((p) => {
                  const steps = [...p.howItWorks.steps];
                  steps[i] = { ...steps[i]!, title: e.target.value };
                  return { ...p, howItWorks: { ...p.howItWorks, steps } };
                })
              }
            />
            <Textarea
              rows={2}
              value={step.body}
              onChange={(e) =>
                onPatch((p) => {
                  const steps = [...p.howItWorks.steps];
                  steps[i] = { ...steps[i]!, body: e.target.value };
                  return { ...p, howItWorks: { ...p.howItWorks, steps } };
                })
              }
            />
          </div>
        ))}
      </div>
    );
  }

  if (sectionId === 'ctaBanner') {
    const b = payload.ctaBanner;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={b.heading}
            onChange={(e) =>
              onPatch((p) => ({ ...p, ctaBanner: { ...p.ctaBanner, heading: e.target.value } }))
            }
          />
        </Field>
        <Field label="Body">
          <Textarea
            rows={3}
            value={b.body}
            onChange={(e) =>
              onPatch((p) => ({ ...p, ctaBanner: { ...p.ctaBanner, body: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={b.cta}
          onChange={(cta) => onPatch((p) => ({ ...p, ctaBanner: { ...p.ctaBanner, cta } }))}
        />
      </div>
    );
  }

  if (sectionId === 'newsletter') {
    const b = payload.newsletter;
    return (
      <div className="space-y-4">
        <Field label="Title">
          <Input
            value={b.title}
            onChange={(e) =>
              onPatch((p) => ({ ...p, newsletter: { ...p.newsletter, title: e.target.value } }))
            }
          />
        </Field>
        <Field label="Body">
          <Textarea
            rows={3}
            value={b.body}
            onChange={(e) =>
              onPatch((p) => ({ ...p, newsletter: { ...p.newsletter, body: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={b.cta}
          onChange={(cta) => onPatch((p) => ({ ...p, newsletter: { ...p.newsletter, cta } }))}
        />
      </div>
    );
  }

  if (sectionId === 'why') {
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={payload.why.heading}
            onChange={(e) =>
              onPatch((p) => ({ ...p, why: { ...p.why, heading: e.target.value } }))
            }
          />
        </Field>
        <Field label="Points (one per line)">
          <Textarea
            rows={8}
            value={payload.why.points.join('\n')}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                why: {
                  ...p.why,
                  points: e.target.value
                    .split('\n')
                    .map((x) => x.trim())
                    .filter(Boolean),
                },
              }))
            }
          />
        </Field>
      </div>
    );
  }

  if (sectionId === 'accessFaq') {
    const b = payload.accessFaq;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={b.heading}
            onChange={(e) =>
              onPatch((p) => ({ ...p, accessFaq: { ...p.accessFaq, heading: e.target.value } }))
            }
          />
        </Field>
        <Field label="Body">
          <Textarea
            rows={3}
            value={b.body}
            onChange={(e) =>
              onPatch((p) => ({ ...p, accessFaq: { ...p.accessFaq, body: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={b.cta}
          onChange={(cta) => onPatch((p) => ({ ...p, accessFaq: { ...p.accessFaq, cta } }))}
        />
        <Field label="FAQ heading">
          <Input
            value={b.faqHeading}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                accessFaq: { ...p.accessFaq, faqHeading: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Highlights (one per line)">
          <Textarea
            rows={4}
            value={b.highlights.join('\n')}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                accessFaq: {
                  ...p.accessFaq,
                  highlights: e.target.value
                    .split('\n')
                    .map((x) => x.trim())
                    .filter(Boolean),
                },
              }))
            }
          />
        </Field>
        {b.faqs.map((faq, i) => (
          <div key={faq.id} className="space-y-2 rounded border border-[var(--line)] p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">FAQ {i + 1}</p>
            <Input
              value={faq.question}
              placeholder="Question"
              onChange={(e) =>
                onPatch((p) => {
                  const faqs = [...p.accessFaq.faqs];
                  faqs[i] = { ...faqs[i]!, question: e.target.value };
                  return { ...p, accessFaq: { ...p.accessFaq, faqs } };
                })
              }
            />
            <Textarea
              rows={3}
              value={faq.answer}
              placeholder="Answer"
              onChange={(e) =>
                onPatch((p) => {
                  const faqs = [...p.accessFaq.faqs];
                  faqs[i] = { ...faqs[i]!, answer: e.target.value };
                  return { ...p, accessFaq: { ...p.accessFaq, faqs } };
                })
              }
            />
          </div>
        ))}
      </div>
    );
  }

  if (isCustomLayoutSectionId(sectionId)) {
    const customId = sectionId.slice('custom:'.length);
    const block = payload.customSections.find((c) => c.id === customId);
    if (!block) return <p className="text-sm text-[var(--muted)]">Custom block missing.</p>;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={block.heading}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                customSections: p.customSections.map((c) =>
                  c.id === customId ? { ...c, heading: e.target.value } : c,
                ),
              }))
            }
          />
        </Field>
        <Field label="Body">
          <Textarea
            rows={5}
            value={block.body}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                customSections: p.customSections.map((c) =>
                  c.id === customId ? { ...c, body: e.target.value } : c,
                ),
              }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={block.cta}
          onChange={(cta) =>
            onPatch((p) => ({
              ...p,
              customSections: p.customSections.map((c) =>
                c.id === customId ? { ...c, cta } : c,
              ),
            }))
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onDuplicateCustom}>
            <Copy className="size-3.5" />
            Duplicate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-[var(--danger)]"
            onClick={onRequestRemoveCustom}
          >
            <Trash2 className="size-3.5" />
            Delete section
          </Button>
        </div>
      </div>
    );
  }

  // Generic heading/body editors for remaining sections
  if (sectionId === 'latest') {
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={payload.latest.heading}
            onChange={(e) =>
              onPatch((p) => ({ ...p, latest: { ...p.latest, heading: e.target.value } }))
            }
          />
        </Field>
        <Field label="Subtitle">
          <Input
            value={payload.latest.subtitle}
            onChange={(e) =>
              onPatch((p) => ({ ...p, latest: { ...p.latest, subtitle: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={payload.latest.cta}
          onChange={(cta) => onPatch((p) => ({ ...p, latest: { ...p.latest, cta } }))}
        />
      </div>
    );
  }

  if (sectionId === 'newsStrip') {
    const b = payload.newsStrip;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={b.heading}
            onChange={(e) =>
              onPatch((p) => ({ ...p, newsStrip: { ...p.newsStrip, heading: e.target.value } }))
            }
          />
        </Field>
        <Field label="Subtitle">
          <Input
            value={b.subtitle}
            onChange={(e) =>
              onPatch((p) => ({ ...p, newsStrip: { ...p.newsStrip, subtitle: e.target.value } }))
            }
          />
        </Field>
        <CtaFields
          label="Button"
          cta={b.cta}
          onChange={(cta) => onPatch((p) => ({ ...p, newsStrip: { ...p.newsStrip, cta } }))}
        />
      </div>
    );
  }

  if (sectionId === 'dashboardPreview') {
    const b = payload.dashboardPreview;
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={b.heading}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                dashboardPreview: { ...p.dashboardPreview, heading: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Body">
          <Textarea
            rows={3}
            value={b.body}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                dashboardPreview: { ...p.dashboardPreview, body: e.target.value },
              }))
            }
          />
        </Field>
        <CtaFields
          label="Primary button"
          cta={b.primaryCta}
          onChange={(cta) =>
            onPatch((p) => ({
              ...p,
              dashboardPreview: { ...p.dashboardPreview, primaryCta: cta },
            }))
          }
        />
        <CtaFields
          label="Secondary button"
          cta={b.secondaryCta}
          onChange={(cta) =>
            onPatch((p) => ({
              ...p,
              dashboardPreview: { ...p.dashboardPreview, secondaryCta: cta },
            }))
          }
        />
      </div>
    );
  }

  if (sectionId === 'productFeatures') {
    return (
      <div className="space-y-4">
        <Field label="Heading">
          <Input
            value={payload.productFeatures.heading}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                productFeatures: { ...p.productFeatures, heading: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Subtitle">
          <Input
            value={payload.productFeatures.subtitle ?? ''}
            onChange={(e) =>
              onPatch((p) => ({
                ...p,
                productFeatures: { ...p.productFeatures, subtitle: e.target.value },
              }))
            }
          />
        </Field>
        {payload.productFeatures.items.map((item, i) => (
          <div key={item.id} className="space-y-2 rounded border border-[var(--line)] p-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Feature {i + 1}</p>
            <Input
              value={item.title}
              placeholder="Title"
              onChange={(e) =>
                onPatch((p) => {
                  const items = [...p.productFeatures.items];
                  items[i] = { ...items[i]!, title: e.target.value };
                  return { ...p, productFeatures: { ...p.productFeatures, items } };
                })
              }
            />
            <Textarea
              rows={2}
              value={item.body}
              placeholder="Description"
              onChange={(e) =>
                onPatch((p) => {
                  const items = [...p.productFeatures.items];
                  items[i] = { ...items[i]!, body: e.target.value };
                  return { ...p, productFeatures: { ...p.productFeatures, items } };
                })
              }
            />
            <Input
              value={item.cta}
              placeholder="Button label"
              onChange={(e) =>
                onPatch((p) => {
                  const items = [...p.productFeatures.items];
                  items[i] = { ...items[i]!, cta: e.target.value };
                  return { ...p, productFeatures: { ...p.productFeatures, items } };
                })
              }
            />
            <Input
              value={item.href}
              placeholder="/path or https://…"
              onChange={(e) =>
                onPatch((p) => {
                  const items = [...p.productFeatures.items];
                  items[i] = { ...items[i]!, href: e.target.value };
                  return { ...p, productFeatures: { ...p.productFeatures, items } };
                })
              }
            />
          </div>
        ))}
      </div>
    );
  }

  if (sectionId === 'liveStats' || sectionId === 'sampleMcq') {
    return (
      <div className="space-y-3 text-sm text-[var(--muted)]">
        <p>
          This section is driven by live database content
          {sectionId === 'liveStats' ? ' (platform counts)' : ' (published MCQs)'}.
        </p>
        {sectionId === 'liveStats' ? (
          <Field label="Optional heading override">
            <Input
              value={payload.liveStats.heading ?? ''}
              onChange={(e) =>
                onPatch((p) => ({
                  ...p,
                  liveStats: { ...p.liveStats, heading: e.target.value },
                }))
              }
            />
          </Field>
        ) : (
          <>
            <Field label="Eyebrow">
              <Input
                value={payload.sampleMcq.eyebrow}
                onChange={(e) =>
                  onPatch((p) => ({
                    ...p,
                    sampleMcq: { ...p.sampleMcq, eyebrow: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="CTA label">
              <Input
                value={payload.sampleMcq.ctaLabel}
                onChange={(e) =>
                  onPatch((p) => ({
                    ...p,
                    sampleMcq: { ...p.sampleMcq, ctaLabel: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="CTA URL">
              <Input
                value={payload.sampleMcq.ctaHref}
                onChange={(e) =>
                  onPatch((p) => ({
                    ...p,
                    sampleMcq: { ...p.sampleMcq, ctaHref: e.target.value },
                  }))
                }
              />
            </Field>
          </>
        )}
        <p>Use the visibility toggle in the section list to hide it entirely.</p>
      </div>
    );
  }

  return (
    <p className="text-sm text-[var(--muted)]">
      Use visibility and order controls for this section. Detailed fields are available for hero,
      CTAs, FAQ, and content blocks.
    </p>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CtaFields({
  label,
  cta,
  onChange,
}: {
  label: string;
  cta: { label: string; href: string; visible: boolean };
  onChange: (cta: { label: string; href: string; visible: boolean }) => void;
}) {
  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] p-3">
      <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">{label}</p>
      <Input
        value={cta.label}
        placeholder="Button text"
        onChange={(e) => onChange({ ...cta, label: e.target.value })}
      />
      <Input
        value={cta.href}
        placeholder="/path or https://…"
        onChange={(e) => onChange({ ...cta, href: e.target.value })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={cta.visible}
          onChange={(e) => onChange({ ...cta, visible: e.target.checked })}
        />
        Button visible
      </label>
    </div>
  );
}
