'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, LayoutGrid, List, PlayCircle, Rows3, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LearnerPage } from '@/components/layout/learner-page';
import { AnswersLockedNote } from '@/components/marketing/answers-locked-note';
import { BookmarksPageSkeleton } from '@/components/skeletons';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { isUnauthorized } from '@/features/auth/use-auth';
import { SavedDocumentPanel } from '@/features/bookmarks/saved-document-panel';
import {
  collectionQuery,
  MAX_SAVED_EXAM_QUESTIONS,
  savedExamHref,
  type FolderKey,
} from '@/features/bookmarks/saved-exam';
import { SavedFolderBar } from '@/features/bookmarks/saved-folder-bar';
import { SavedItemNavigator } from '@/features/bookmarks/saved-item-navigator';
import {
  mergeSavedItems,
  type DocumentBookmarkRow,
  type SavedItem,
  type SavedQuestionDetailsPage,
} from '@/features/bookmarks/saved-items';
import { SavedQuestionPanel } from '@/features/bookmarks/saved-question-panel';
import { SavedSheetCard } from '@/features/bookmarks/saved-question-sheet-card';
import { ExamBottomSheet } from '@/features/exam-ui/exam-bottom-sheet';
import { ExamMobileBar } from '@/features/exam-ui/exam-take-chrome';
import { useExamHotkeys } from '@/features/exam-ui/use-exam-hotkeys';
import { PreliPracticeStartModal } from '@/features/preli-practice/preli-practice-start-modal';
import { apiFetch, apiFetchResult } from '@/lib/api/client';
import type { BookmarkCollectionsPayload } from '@/lib/api/types';
import { cn } from '@/lib/utils';

function readParams(): { folder: FolderKey; item: string | null } {
  if (typeof window === 'undefined') return { folder: 'all', item: null };
  const sp = new URLSearchParams(window.location.search);
  return { folder: sp.get('folder') || 'all', item: sp.get('item') };
}

function writeParams(folder: FolderKey, item: string | null) {
  const url = new URL(window.location.href);
  if (folder !== 'all') url.searchParams.set('folder', folder);
  else url.searchParams.delete('folder');
  if (item) url.searchParams.set('item', item);
  else url.searchParams.delete('item');
  // replaceState: switching folders / items must not reload or pile up history entries.
  window.history.replaceState(window.history.state, '', url);
}

/**
 * Saved MCQs and PDFs (DEC-059): folder filter, a View All sheet with every
 * question's full stem and options (default), one-at-a-time practice / reading,
 * and an exam built from the selected folder's saved questions.
 */
export default function BookmarksPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [folder, setFolder] = useState<FolderKey>('all');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);

  useEffect(() => {
    const params = readParams();
    setFolder(params.folder);
    setOpenKey(params.item);
  }, []);

  const collections = useQuery({
    queryKey: ['bookmark-collections'],
    queryFn: () => apiFetch<BookmarkCollectionsPayload>('/bookmarks/collections'),
    retry: false,
  });

  // A folder id from an old link (or a just-deleted folder) falls back to everything.
  const folderValid =
    folder === 'all' ||
    folder === 'uncategorized' ||
    !collections.data ||
    collections.data.items.some((f) => f.id === folder);
  const activeFolder: FolderKey = folderValid ? folder : 'all';

  const questions = useInfiniteQuery({
    queryKey: ['bookmarks', 'question-details', activeFolder],
    queryFn: ({ pageParam }) =>
      apiFetchResult<SavedQuestionDetailsPage>(
        `/bookmarks/questions/details?limit=20${collectionQuery(activeFolder)}${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    retry: false,
    enabled: folderValid,
  });

  const documents = useInfiniteQuery({
    queryKey: ['bookmarks', 'documents', activeFolder],
    queryFn: ({ pageParam }) =>
      apiFetchResult<DocumentBookmarkRow[]>(
        `/bookmarks/documents?limit=20${collectionQuery(activeFolder)}${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
    retry: false,
    enabled: folderValid,
  });

  const items = useMemo(
    () =>
      mergeSavedItems(
        {
          rows: questions.data?.pages.flatMap((p) => p.data.items) ?? [],
          hasMore: Boolean(questions.hasNextPage),
        },
        {
          rows: documents.data?.pages.flatMap((p) => p.data) ?? [],
          hasMore: Boolean(documents.hasNextPage),
        },
      ),
    [documents.data, documents.hasNextPage, questions.data, questions.hasNextPage],
  );
  const answersVisible = questions.data?.pages[0]?.data.answersVisible ?? true;

  // Folder totals come from the collections summary (covers rows not loaded yet).
  const folderCounts = useMemo(() => {
    const data = collections.data;
    if (!data) return null;
    const pick = (f: { questionCount: number; documentCount?: number }) => ({
      questions: f.questionCount,
      documents: f.documentCount ?? 0,
    });
    if (activeFolder === 'uncategorized') return pick(data.uncategorized);
    if (activeFolder === 'all') {
      return [data.uncategorized, ...data.items].reduce(
        (acc, f) => ({
          questions: acc.questions + f.questionCount,
          documents: acc.documents + (f.documentCount ?? 0),
        }),
        { questions: 0, documents: 0 },
      );
    }
    const f = data.items.find((x) => x.id === activeFolder);
    return f ? pick(f) : null;
  }, [activeFolder, collections.data]);

  const hasMore = Boolean(questions.hasNextPage || documents.hasNextPage);
  const loadingMore = questions.isFetchingNextPage || documents.isFetchingNextPage;
  const loadMore = () => {
    if (questions.hasNextPage) void questions.fetchNextPage();
    if (documents.hasNextPage) void documents.fetchNextPage();
  };

  const index = openKey ? items.findIndex((i) => i.key === openKey) : -1;
  const current = index >= 0 ? items[index] : undefined;
  const single = Boolean(current);

  const open = useCallback(
    (key: string | null) => {
      setOpenKey(key);
      writeParams(activeFolder, key);
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [activeFolder],
  );

  const selectFolder = useCallback((next: FolderKey) => {
    setFolder(next);
    setOpenKey(null);
    writeParams(next, null);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const item = items[next];
      if (item) open(item.key);
    },
    [items, open],
  );

  const afterChange = (item: SavedItem) => {
    void qc.invalidateQueries({ queryKey: ['bookmarks'] });
    void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
    void qc.invalidateQueries({ queryKey: [item.kind, item.id] });
    if (item.kind === 'document') void qc.invalidateQueries({ queryKey: ['document-bookmark', item.id] });
  };

  const remove = useMutation({
    mutationFn: (item: SavedItem) =>
      apiFetch(`/bookmarks/${item.kind === 'question' ? 'questions' : 'documents'}/${item.id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, item) => {
      afterChange(item);
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const move = useMutation({
    mutationFn: ({ item, collectionId }: { item: SavedItem; collectionId: string | null }) =>
      apiFetch(`/bookmarks/${item.kind === 'question' ? 'questions' : 'documents'}/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ collectionId }),
      }),
    onSuccess: (_data, { item }) => afterChange(item),
  });

  const removeItem = useCallback(
    (item: SavedItem) => {
      // Keep the learner in single view: step to the neighbour before the row disappears.
      if (item.key === openKey) {
        const i = items.findIndex((x) => x.key === item.key);
        const neighbour = items[i + 1] ?? items[i - 1];
        open(neighbour ? neighbour.key : null);
      }
      remove.mutate(item);
    },
    [items, open, openKey, remove],
  );
  const moveItem = useCallback(
    (item: SavedItem, collectionId: string | null) => move.mutate({ item, collectionId }),
    [move],
  );

  useExamHotkeys({
    enabled: single,
    optionCount: 0,
    onSelectIndex: () => undefined,
    onPrevious: () => goTo(index - 1),
    onNext: () => goTo(index + 1),
  });

  const loading = !folderValid || questions.isLoading || documents.isLoading;
  const error = questions.error ?? documents.error ?? collections.error;
  const folderName =
    activeFolder === 'all'
      ? 'All saved items'
      : activeFolder === 'uncategorized'
        ? 'No folder'
        : (collections.data?.items.find((f) => f.id === activeFolder)?.name ?? 'Folder');
  const examQuestionCount = folderCounts?.questions ?? 0;
  const busy = remove.isPending || move.isPending;

  return (
    <LearnerPage dense>
      <header
        className={cn(
          'sticky top-[calc(var(--header-h,4.25rem)+0.5rem)] z-20 rounded-[var(--radius-lg)] border border-[var(--line)]',
          'bg-[color-mix(in_srgb,var(--bg-elevated)_95%,transparent)] px-3 py-2.5 shadow-[var(--shadow-sm)] backdrop-blur-md sm:px-4 sm:py-3',
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--highlight)] uppercase">
              Saved · {folderName}
            </p>
            <h1 className="truncate font-display text-[0.95rem] leading-snug font-bold text-[var(--ink)] sm:text-lg">
              {current ? current.title : 'Questions & PDFs'}
            </h1>
            <p className="truncate text-xs text-[var(--muted-strong)] tabular-nums">
              {single
                ? `Item ${index + 1} of ${items.length}${hasMore ? '+' : ''}`
                : folderCounts
                  ? `${folderCounts.questions} ${folderCounts.questions === 1 ? 'question' : 'questions'} · ${folderCounts.documents} ${folderCounts.documents === 1 ? 'PDF' : 'PDFs'}`
                  : ' '}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={examQuestionCount === 0}
            onClick={() => setExamOpen(true)}
            aria-label={`Take exam from ${examQuestionCount} saved questions in ${folderName}`}
          >
            <PlayCircle className="size-4" aria-hidden />
            <span className="hidden min-[420px]:inline">Take exam</span>
            <span className="min-[420px]:hidden">Exam</span>
          </Button>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => open(single ? null : (items[0]?.key ?? null))}
              aria-pressed={!single}
              className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-xs font-semibold text-[var(--muted-strong)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
            >
              {single ? <List className="size-3.5" aria-hidden /> : <Rows3 className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">{single ? 'View all' : 'One at a time'}</span>
              <span className="sr-only sm:hidden">{single ? 'View all' : 'One at a time'}</span>
            </button>
          ) : null}
        </div>
      </header>

      {!single ? (
        <SavedFolderBar collections={collections.data} folder={activeFolder} onSelect={selectFolder} />
      ) : null}

      {loading && !error ? <BookmarksPageSkeleton omitChrome /> : null}

      {isUnauthorized(error) ? (
        <Alert variant="warning">
          Sign in to view saved items.{' '}
          <Link href="/login?next=/bookmarks" className="font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>
        </Alert>
      ) : null}
      {error && !isUnauthorized(error) ? (
        <Alert variant="danger">Could not load saved items. Try again shortly.</Alert>
      ) : null}
      {move.isError ? <Alert variant="danger">Could not move that item. Try again.</Alert> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title={activeFolder === 'all' ? 'Nothing saved yet' : 'This folder is empty'}
          description={
            activeFolder === 'all'
              ? 'Save an MCQ from a question page or a PDF from the library — you can pick a folder when saving.'
              : 'Move saved items here with the folder menu on each item, or pick this folder when saving.'
          }
          action={
            <div className="flex flex-wrap gap-4">
              <Link href="/questions" className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline">
                Browse questions
              </Link>
              <Link href="/documents" className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline">
                Browse PDFs
              </Link>
            </div>
          }
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
          <div className="min-w-0 space-y-4">
            {current ? (
              <>
                {current.kind === 'question' ? (
                  <SavedQuestionPanel
                    key={current.key}
                    questionId={current.id}
                    number={index + 1}
                    total={items.length}
                  />
                ) : (
                  <SavedDocumentPanel
                    key={current.key}
                    documentId={current.id}
                    number={index + 1}
                    total={items.length}
                  />
                )}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[var(--muted-strong)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                    disabled={busy}
                    onClick={() => removeItem(current)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remove from saved
                  </Button>
                  <StepControls
                    className="hidden lg:flex"
                    index={index}
                    total={items.length}
                    onPrevious={() => goTo(index - 1)}
                    onNext={() => goTo(index + 1)}
                  />
                </div>
                {index === items.length - 1 && hasMore ? (
                  <LoadMore pending={loadingMore} onClick={loadMore} />
                ) : null}
              </>
            ) : (
              <>
                {!answersVisible && items.some((i) => i.kind === 'question') ? (
                  <AnswersLockedNote detail="Your saved questions and options are shown in full; correct answers and explanations appear here once you subscribe." />
                ) : null}
                {items.map((item, i) => (
                  <SavedSheetCard
                    key={item.key}
                    item={item}
                    number={i + 1}
                    folders={collections.data?.items ?? []}
                    busy={busy}
                    onOpen={open}
                    onMove={moveItem}
                    onRemove={removeItem}
                  />
                ))}
                {hasMore ? <LoadMore pending={loadingMore} onClick={loadMore} /> : null}
              </>
            )}
          </div>

          <aside className="hidden space-y-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] lg:sticky lg:top-[calc(var(--header-h,4.25rem)+7rem)] lg:block">
            <SavedItemNavigator
              items={items}
              currentIndex={index}
              onJump={(i) => {
                const item = items[i];
                if (!item) return;
                if (single) open(item.key);
                else
                  document
                    .getElementById(`saved-${item.key}`)
                    ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
              }}
            />
            {single ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => open(null)}>
                <List className="size-4" aria-hidden />
                Back to all items
              </Button>
            ) : null}
          </aside>
        </div>
      ) : null}

      {single ? (
        <ExamMobileBar>
          <StepControls
            index={index}
            total={items.length}
            onPrevious={() => goTo(index - 1)}
            onNext={() => goTo(index + 1)}
            onOpenNavigator={() => setNavOpen(true)}
          />
        </ExamMobileBar>
      ) : null}

      <ExamBottomSheet open={navOpen} title="Saved items" onClose={() => setNavOpen(false)}>
        <SavedItemNavigator
          items={items}
          currentIndex={index}
          onJump={(i) => {
            setNavOpen(false);
            goTo(i);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={() => {
            setNavOpen(false);
            open(null);
          }}
        >
          <List className="size-4" aria-hidden />
          Back to all items
        </Button>
      </ExamBottomSheet>

      <PreliPracticeStartModal
        open={examOpen}
        title="Exam from saved questions"
        setTitle={
          examQuestionCount > MAX_SAVED_EXAM_QUESTIONS
            ? `${folderName} — newest ${MAX_SAVED_EXAM_QUESTIONS} of ${examQuestionCount} questions`
            : folderName
        }
        questionCount={Math.min(examQuestionCount, MAX_SAVED_EXAM_QUESTIONS)}
        onClose={() => setExamOpen(false)}
        onStart={(minutes) => {
          setExamOpen(false);
          router.push(savedExamHref(activeFolder, minutes));
        }}
      />
    </LearnerPage>
  );
}

function StepControls({
  index,
  total,
  onPrevious,
  onNext,
  onOpenNavigator,
  className,
}: {
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onOpenNavigator?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button type="button" variant="outline" className="flex-1 sm:flex-none" disabled={index <= 0} onClick={onPrevious}>
        <ChevronLeft className="size-4" aria-hidden />
        Previous
      </Button>
      {onOpenNavigator ? (
        <Button
          type="button"
          variant="ghost"
          className="shrink-0 px-3 tabular-nums"
          onClick={onOpenNavigator}
          aria-label={`Item ${index + 1} of ${total}. Open saved item navigator`}
        >
          <LayoutGrid className="size-4" aria-hidden />
          {index + 1}/{total}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        className="flex-1 sm:flex-none"
        disabled={index >= total - 1}
        onClick={onNext}
      >
        Next
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

function LoadMore({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-center pt-1">
      <Button variant="outline" className="cursor-pointer rounded-full px-6" disabled={pending} onClick={onClick}>
        {pending ? 'Loading…' : 'Load more'}
      </Button>
    </div>
  );
}
