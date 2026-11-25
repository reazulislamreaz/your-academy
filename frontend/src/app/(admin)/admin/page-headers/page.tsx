'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DEFAULT_FOOTER,
  DEFAULT_PAGE_HEADERS,
  PAGE_HEADER_KEYS,
  PAGE_HEADER_ROUTES,
  homepagePayloadSchema,
  normalizeHomepagePayload,
  type HomepagePayload,
  type PageHeaderContent,
  type PageHeaderKey,
} from '@your-academy/shared';
import { AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { HomepagePublishControls } from '@/features/admin/homepage-sections/shared/homepage-publish-controls';
import {
  EditorGroup,
  LabelFieldsEditor,
  LinkListEditor,
} from '@/features/admin/homepage/site-text-editors';
import { getAdminHomepage, publishHomepage, saveHomepageDraft } from '@/lib/api/homepage';
import { revalidateHomepageCache } from '@/lib/api/revalidate-homepage';
import { formatHomepageSaveError } from '@/lib/marketing/homepage-cms-validation';

type Footer = typeof DEFAULT_FOOTER;
type Headers = Record<PageHeaderKey, PageHeaderContent>;

const HEADER_FIELDS: Array<{ key: keyof PageHeaderContent; label: string; hint?: string }> = [
  {
    key: 'eyebrow',
    label: 'Small label above the heading',
    hint: 'Optional — leave empty to hide',
  },
  { key: 'heading', label: 'Heading (H1)' },
  { key: 'description', label: 'Intro paragraph', hint: 'Optional — leave empty to hide' },
  {
    key: 'metaTitle',
    label: 'SEO title',
    hint: 'Shown in the browser tab and Google (full title)',
  },
  {
    key: 'metaDescription',
    label: 'SEO description',
    hint: 'Google snippet, about 150 characters',
  },
];

/**
 * DEC-069 — Admin → Page Headers & Footer. Stored in the homepage CMS draft, so it shares
 * draft → publish, revision history and the cache purge. Saving merges only these two blocks
 * into the latest draft, so homepage edits made elsewhere are never overwritten.
 */
export default function AdminPageHeadersPage() {
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ['admin-homepage'], queryFn: getAdminHomepage });
  const [headers, setHeaders] = useState<Headers>(DEFAULT_PAGE_HEADERS);
  const [footer, setFooter] = useState<Footer>(DEFAULT_FOOTER);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    if (!admin.data || dirty) return;
    const draft = admin.data.draft.payload;
    setHeaders({ ...DEFAULT_PAGE_HEADERS, ...draft.pageHeaders });
    setFooter({ ...DEFAULT_FOOTER, ...draft.footer });
  }, [admin.data, dirty]);

  /** Latest draft + these two blocks, validated with the shared schema before sending. */
  const buildPayload = async (): Promise<{
    payload: HomepagePayload;
    heroImageAssetId: string | null;
  }> => {
    const latest = await getAdminHomepage();
    const merged = { ...latest.draft.payload, pageHeaders: headers, footer };
    const parsed = homepagePayloadSchema.safeParse(merged);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(
        `${issue?.path.join(' › ') ?? 'Content'}: ${issue?.message ?? 'invalid value'}`,
      );
    }
    return {
      payload: normalizeHomepagePayload(parsed.data),
      heroImageAssetId: latest.draft.heroImageAssetId,
    };
  };

  const errorText = (err: unknown, kind: 'save' | 'publish') =>
    err instanceof Error && !('code' in err) ? err.message : formatHomepageSaveError(err, kind);

  const save = useMutation({
    mutationFn: async () => saveHomepageDraft(await buildPayload()),
    onSuccess: () => {
      setDirty(false);
      setMessage({ tone: 'success', text: 'Draft saved. Publish to update the live pages.' });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err) => setMessage({ tone: 'danger', text: errorText(err, 'save') }),
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (dirty) await saveHomepageDraft(await buildPayload());
      await publishHomepage();
      return revalidateHomepageCache();
    },
    onSuccess: (cache) => {
      setDirty(false);
      setMessage({
        tone: 'success',
        text: cache.ok
          ? 'Published. The pages below show the new text now.'
          : `Published, but the cache refresh lagged (${cache.detail ?? 'unknown'}). Reload the page to check.`,
      });
      void qc.invalidateQueries({ queryKey: ['admin-homepage'] });
      void qc.invalidateQueries({ queryKey: ['admin-homepage-revisions'] });
    },
    onError: (err) => setMessage({ tone: 'danger', text: errorText(err, 'publish') }),
  });

  const patchHeader = (key: PageHeaderKey, field: keyof PageHeaderContent, value: string) => {
    setHeaders((h) => ({ ...h, [key]: { ...h[key], [field]: value } }));
    setDirty(true);
  };
  const patchFooter = (next: Partial<Footer>) => {
    setFooter((f) => ({ ...f, ...next }));
    setDirty(true);
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Page Headers & Footer"
        description="Heading, intro and SEO text of the listing pages, and the site footer. Saved with the homepage draft: publish to make changes live (revision history is under Admin → Homepage)."
        actions={
          <HomepagePublishControls
            dirty={dirty}
            pending={save.isPending || publish.isPending}
            onSaveDraft={() => save.mutate()}
            onPublish={() => publish.mutate()}
          />
        }
      />

      {message ? <Alert variant={message.tone}>{message.text}</Alert> : null}
      {admin.isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {admin.isError ? (
        <LoadError message="Could not load the content." onRetry={() => void admin.refetch()} />
      ) : null}

      {admin.data ? (
        <>
          {PAGE_HEADER_KEYS.map((key) => (
            <AdminSection
              key={key}
              title={PAGE_HEADER_ROUTES[key].name}
              actions={
                <Link
                  href={PAGE_HEADER_ROUTES[key].route}
                  target="_blank"
                  className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline"
                >
                  {PAGE_HEADER_ROUTES[key].route}
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              }
            >
              <Surface className="p-3.5 sm:p-5">
                <LabelFieldsEditor
                  fields={HEADER_FIELDS}
                  multiline={['description', 'metaDescription']}
                  values={headers[key]}
                  onChange={(field, value) => patchHeader(key, field, value)}
                />
              </Surface>
            </AdminSection>
          ))}

          <AdminSection
            title="Site footer"
            description="Shown on every public page. The Explore links follow the site navigation; social links are under Admin → Social links."
          >
            <Surface className="space-y-4 p-3.5 sm:p-5">
              <LabelFieldsEditor
                fields={[
                  { key: 'tagline', label: 'Tagline' },
                  { key: 'accountHeading', label: 'Account column heading' },
                  {
                    key: 'helpText',
                    label: 'Help note',
                    hint: '“Browse the FAQ” in this text links to the FAQ',
                  },
                  { key: 'copyright', label: 'Copyright line' },
                ]}
                multiline={['tagline', 'helpText']}
                values={{
                  tagline: footer.tagline,
                  accountHeading: footer.accountHeading,
                  helpText: footer.helpText,
                  copyright: footer.copyright,
                }}
                onChange={(field, value) => patchFooter({ [field]: value })}
              />
              <EditorGroup title="Account links">
                <LinkListEditor
                  items={footer.accountLinks}
                  max={10}
                  itemName="link"
                  onChange={(accountLinks) => patchFooter({ accountLinks })}
                />
              </EditorGroup>
            </Surface>
          </AdminSection>
        </>
      ) : null}
    </AdminPage>
  );
}
