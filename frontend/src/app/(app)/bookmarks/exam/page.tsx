'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { PageLoader } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import {
  clearSavedExamSession,
  DEFAULT_SAVED_EXAM_MINUTES,
  loadSavedExamQuestions,
  loadSavedExamSession,
  MAX_SAVED_EXAM_QUESTIONS,
  saveSavedExamSession,
  submitSavedExam,
  type FolderKey,
} from '@/features/bookmarks/saved-exam';
import { BANGLA_OPTION_LABELS } from '@/features/exam-ui/option-labels';
import { TimedSheetPlayer, type TimedSheetQuestion } from '@/features/exam-ui/timed-sheet-player';
import { apiFetch } from '@/lib/api/client';
import type { BookmarkCollectionsPayload } from '@/lib/api/types';

type Params = { folder: FolderKey; minutes: number };

function readParams(): Params {
  const sp = new URLSearchParams(window.location.search);
  const minutes = Number.parseInt(sp.get('minutes') ?? '', 10);
  return {
    folder: sp.get('folder') || 'all',
    minutes:
      Number.isFinite(minutes) && minutes >= 1 && minutes <= 180
        ? minutes
        : DEFAULT_SAVED_EXAM_MINUTES,
  };
}

/**
 * Timed exam over the user's saved MCQs (all or one folder), using the same player
 * as Quiz / Model Test. Scoring is server-side and only counts the user's own saves.
 */
export default function SavedExamPage() {
  const [params, setParams] = useState<Params | null>(null);
  useEffect(() => setParams(readParams()), []);

  const folder = params?.folder ?? 'all';
  const backHref = folder === 'all' ? '/bookmarks' : `/bookmarks?folder=${encodeURIComponent(folder)}`;

  const collections = useQuery({
    queryKey: ['bookmark-collections'],
    queryFn: () => apiFetch<BookmarkCollectionsPayload>('/bookmarks/collections'),
    enabled: Boolean(params),
  });

  const loaded = useQuery({
    queryKey: ['saved-exam-questions', folder],
    queryFn: () => loadSavedExamQuestions(folder),
    enabled: Boolean(params),
    // The set must not change under the learner mid-exam.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // After a refresh, keep the exact question set the attempt started with.
  const { questions, durationMinutes } = useMemo(() => {
    const all = loaded.data?.questions ?? [];
    const session = params ? loadSavedExamSession(params.folder) : null;
    if (!session) return { questions: all, durationMinutes: params?.minutes ?? DEFAULT_SAVED_EXAM_MINUTES };
    const byId = new Map(all.map((q) => [q.id, q]));
    return {
      questions: session.questionIds.flatMap((id) => {
        const q = byId.get(id);
        return q ? [q] : [];
      }),
      durationMinutes: session.durationMinutes ?? params?.minutes ?? DEFAULT_SAVED_EXAM_MINUTES,
    };
  }, [loaded.data, params]);

  const sheet = useMemo<TimedSheetQuestion[]>(
    () =>
      questions.map((q) => ({
        id: q.id,
        questionText: q.content?.trim() || q.title,
        options: q.options.map((o) => o.content),
      })),
    [questions],
  );

  const folderName =
    folder === 'all'
      ? 'All saved questions'
      : folder === 'uncategorized'
        ? 'Saved questions (no folder)'
        : (collections.data?.items.find((f) => f.id === folder)?.name ?? 'Saved folder');

  if (!params || loaded.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <PageLoader compact label="Preparing your exam" />
      </div>
    );
  }

  if (loaded.isError || questions.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Alert variant={loaded.isError ? 'danger' : 'warning'}>
          {loaded.isError
            ? 'Could not load your saved questions. Try again shortly.'
            : 'There are no saved questions in this folder to build an exam from.'}{' '}
          <Link href={backHref} className="font-semibold underline-offset-2 hover:underline">
            Back to saved items
          </Link>
        </Alert>
      </div>
    );
  }

  return (
    <TimedSheetPlayer
      kindLabel="Saved questions exam"
      title={folderName}
      description={
        loaded.data?.truncated
          ? `Uses your newest ${MAX_SAVED_EXAM_QUESTIONS} saved questions from this folder.`
          : 'Built from the questions you saved.'
      }
      durationInMinutes={durationMinutes}
      totalQuestions={sheet.length}
      questions={sheet}
      // Same ক–ঘ badges as Preli Practice, whose result view this exam reuses.
      optionLabels={BANGLA_OPTION_LABELS}
      listHref={backHref}
      listLabel="Back to saved items"
      loadSession={() => loadSavedExamSession(folder)}
      saveSession={(session) =>
        saveSavedExamSession(folder, {
          ...session,
          questionIds: questions.map((q) => q.id),
          durationMinutes,
        })
      }
      clearSession={() => clearSavedExamSession(folder)}
      submitAttempt={(body) =>
        submitSavedExam({
          folder,
          title: folderName,
          durationMinutes,
          elapsedSeconds: body.elapsedSeconds,
          timedOut: body.timedOut,
          questions,
          answersByText: body.userAnswers,
        })
      }
      resultHref={(runId) => `/bookmarks/exam/result?run=${encodeURIComponent(runId)}`}
      submitErrorFallback="Could not submit your exam. Please try again."
    />
  );
}
