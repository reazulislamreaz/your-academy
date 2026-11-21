'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import type { HomepageIconKey } from '@your-academy/shared';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { DirectoryPageShell } from '@/components/marketing/directory-page-shell';
import { DirectoryTileGridSkeleton } from '@/components/marketing/directory-tile-grid-skeleton';
import { HomepageTileCard } from '@/components/marketing/homepage-tile-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRegion } from '@/components/ui/skeleton';
import { TopicSetList } from '@/features/topic-base/topic-set-list';
import {
  fetchPublicCategories,
  publicCategoriesQueryKey,
} from '@/lib/api/categories';
import type { CategoryLeaf, CategoryNode } from '@/lib/api/types';
import {
  ALL_TOPICS_PATH,
  guessHomepageIconKey,
  topicExplorerHref,
} from '@/lib/homepage-tile-links';

type Props = {
  heading?: string;
  breadcrumbLabel?: string;
};

type FolderTile = {
  id: string;
  name: string;
  iconKey: HomepageIconKey;
  href: string;
};

function asIcon(key: string | null | undefined, fallbackName: string): HomepageIconKey {
  return (key || guessHomepageIconKey(fallbackName)) as HomepageIconKey;
}

function childCount(node: CategoryLeaf | CategoryNode): number {
  return node.children?.length ?? 0;
}

/**
 * Folder-style Topic Base explorer (DEC-042):
 * Category → Sub Category → Child Category.
 * Title-first sets appear only on leaf Sub/Child folders with uploads.
 */
export function AllTopicsDirectory({
  heading = 'All Topics',
  breadcrumbLabel = 'Topic Base Question Analysis',
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get('categoryId')?.trim() || '';
  const subcategoryId = searchParams.get('subcategoryId')?.trim() || '';
  const childCategoryId = searchParams.get('childCategoryId')?.trim() || '';

  const tree = useQuery({
    queryKey: publicCategoriesQueryKey('TOPIC'),
    queryFn: () => fetchPublicCategories('TOPIC'),
    staleTime: 60_000,
  });

  const roots = tree.data ?? [];

  const selectedCategory = useMemo(
    () => roots.find((r) => r.id === categoryId) ?? null,
    [roots, categoryId],
  );
  const selectedSubcategory = useMemo(
    () => selectedCategory?.children?.find((s) => s.id === subcategoryId) ?? null,
    [selectedCategory, subcategoryId],
  );
  const selectedChild = useMemo(
    () => selectedSubcategory?.children?.find((c) => c.id === childCategoryId) ?? null,
    [selectedSubcategory, childCategoryId],
  );

  const activeFolderName =
    selectedChild?.name ||
    selectedSubcategory?.name ||
    selectedCategory?.name ||
    null;

  const folderTiles: FolderTile[] = useMemo(() => {
    if (!categoryId) {
      return roots.map((root) => ({
        id: root.id,
        name: root.name,
        iconKey: asIcon(root.iconKey, root.name),
        href: topicExplorerHref({ categoryId: root.id }),
      }));
    }
    if (selectedCategory && !subcategoryId) {
      return (selectedCategory.children ?? []).map((sub) => ({
        id: sub.id,
        name: sub.name,
        iconKey: asIcon(sub.iconKey || selectedCategory.iconKey, sub.name),
        href: topicExplorerHref({
          categoryId: selectedCategory.id,
          subcategoryId: sub.id,
        }),
      }));
    }
    if (selectedCategory && selectedSubcategory && !childCategoryId) {
      return (selectedSubcategory.children ?? []).map((child) => ({
        id: child.id,
        name: child.name,
        iconKey: asIcon(
          child.iconKey || selectedSubcategory.iconKey || selectedCategory.iconKey,
          child.name,
        ),
        href: topicExplorerHref({
          categoryId: selectedCategory.id,
          subcategoryId: selectedSubcategory.id,
          childCategoryId: child.id,
        }),
      }));
    }
    return [];
  }, [
    roots,
    categoryId,
    subcategoryId,
    childCategoryId,
    selectedCategory,
    selectedSubcategory,
  ]);

  const crumbs = useMemo(() => {
    const items: Array<{ label: string; href: string }> = [
      { label: 'All Topics', href: ALL_TOPICS_PATH },
    ];
    if (selectedCategory) {
      items.push({
        label: selectedCategory.name,
        href: topicExplorerHref({ categoryId: selectedCategory.id }),
      });
    }
    if (selectedCategory && selectedSubcategory) {
      items.push({
        label: selectedSubcategory.name,
        href: topicExplorerHref({
          categoryId: selectedCategory.id,
          subcategoryId: selectedSubcategory.id,
        }),
      });
    }
    if (selectedCategory && selectedSubcategory && selectedChild) {
      items.push({
        label: selectedChild.name,
        href: topicExplorerHref({
          categoryId: selectedCategory.id,
          subcategoryId: selectedSubcategory.id,
          childCategoryId: selectedChild.id,
        }),
      });
    }
    return items;
  }, [selectedCategory, selectedSubcategory, selectedChild]);

  const parentHref =
    crumbs.length > 1 ? crumbs[crumbs.length - 2]!.href : ALL_TOPICS_PATH;

  // Leaf = Child Category, or Sub Category with no nested children.
  const leafFolderId = useMemo(() => {
    if (selectedChild) return selectedChild.id;
    if (selectedSubcategory && childCount(selectedSubcategory) === 0) {
      return selectedSubcategory.id;
    }
    return null;
  }, [selectedChild, selectedSubcategory]);

  useEffect(() => {
    if (tree.isLoading || tree.isError) return;
    if (categoryId && !selectedCategory) {
      router.replace(ALL_TOPICS_PATH);
      return;
    }
    if (subcategoryId && selectedCategory && !selectedSubcategory) {
      router.replace(topicExplorerHref({ categoryId: selectedCategory.id }));
      return;
    }
    if (childCategoryId && selectedCategory && selectedSubcategory && !selectedChild) {
      router.replace(
        topicExplorerHref({
          categoryId: selectedCategory.id,
          subcategoryId: selectedSubcategory.id,
        }),
      );
    }
  }, [
    tree.isLoading,
    tree.isError,
    categoryId,
    subcategoryId,
    childCategoryId,
    selectedCategory,
    selectedSubcategory,
    selectedChild,
    router,
  ]);

  return (
    <DirectoryPageShell
      heading={activeFolderName ?? heading}
      breadcrumbLabel={breadcrumbLabel}
      backLabel="Back to homepage"
    >
      <nav aria-label="Topic folder path" className="space-y-3">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted-strong)]">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
                ) : null}
                {isLast ? (
                  <span className="font-medium text-[var(--ink)]" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="font-medium transition-colors hover:text-[var(--highlight)]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
        {crumbs.length > 1 ? (
          <Link
            href={parentHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Up
          </Link>
        ) : null}
      </nav>

      {tree.isLoading ? (
        <SkeletonRegion
          loading
          label="Loading topic folders"
          fallback={<DirectoryTileGridSkeleton count={8} />}
        >
          <span className="sr-only">Loading</span>
        </SkeletonRegion>
      ) : tree.isError ? (
        <EmptyState align="center" title="Couldn’t load topics" />
      ) : roots.length === 0 ? (
        <EmptyState align="center" title="No topics yet" />
      ) : (
        <div className="space-y-8">
          {folderTiles.length > 0 ? (
            <ul className="motion-stagger grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4">
              {folderTiles.map((tile) => (
                <li key={tile.id}>
                  <HomepageTileCard
                    href={tile.href}
                    title={tile.name}
                    iconKey={tile.iconKey}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {leafFolderId ? <TopicSetList folderId={leafFolderId} /> : null}
        </div>
      )}
    </DirectoryPageShell>
  );
}
