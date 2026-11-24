import type { TimedSheetSession } from '@/features/exam-ui/timed-sheet-player';
import type { PreliPracticeResult } from '@/features/preli-practice/preli-practice-session';
import { apiFetch, apiFetchResult } from '@/lib/api/client';
import type { SavedQuestionDetail, SavedQuestionDetailsPage } from './saved-items';

/** Folder selection shared by the Saved page and the saved-questions exam. */
export type FolderKey = 'all' | 'uncategorized' | string;

/** Must match `MAX_SAVED_EXAM_QUESTIONS` on the API. */
export const MAX_SAVED_EXAM_QUESTIONS = 200;
export const DEFAULT_SAVED_EXAM_MINUTES = 30;

/** `collectionId` query fragment for the bookmarks APIs ('' = every folder). */
export function collectionQuery(folder: FolderKey): string {
  return folder === 'all' ? '' : `&collectionId=${encodeURIComponent(folder)}`;
}

export function savedExamHref(folder: FolderKey, minutes: number): string {
  return `/bookmarks/exam?folder=${encodeURIComponent(folder)}&minutes=${minutes}`;
}

/** Newest-first saved MCQs for an exam, capped at the API maximum. */
export async function loadSavedExamQuestions(
  folder: FolderKey,
): Promise<{ questions: SavedQuestionDetail[]; truncated: boolean }> {
  const questions: SavedQuestionDetail[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await apiFetchResult<SavedQuestionDetailsPage>(
      `/bookmarks/questions/details?limit=100${collectionQuery(folder)}${cursor ? `&cursor=${cursor}` : ''}`,
    );
    questions.push(...page.data.items.map((row) => row.question));
    const next = page.pagination?.nextCursor;
    if (!next || questions.length >= MAX_SAVED_EXAM_QUESTIONS) {
      return {
        questions: questions.slice(0, MAX_SAVED_EXAM_QUESTIONS),
        truncated: Boolean(next) || questions.length > MAX_SAVED_EXAM_QUESTIONS,
      };
    }
    cursor = next;
  }
}

/** In-progress exam: the player's own progress plus the question set it started with. */
export type SavedExamSession = TimedSheetSession & {
  questionIds: string[];
  durationMinutes?: number;
};

const sessionKey = (folder: FolderKey) => `ya-saved-exam:${folder}`;
const resultKey = (runId: string) => `ya-saved-exam-result:${runId}`;

function read<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — the exam still works, it just won't survive a refresh */
  }
}

export function loadSavedExamSession(folder: FolderKey): SavedExamSession | null {
  const s = read<SavedExamSession>(sessionKey(folder));
  if (!s || typeof s.startedAtMs !== 'number' || !Array.isArray(s.questionIds)) return null;
  return s;
}

export function saveSavedExamSession(folder: FolderKey, session: SavedExamSession): void {
  write(sessionKey(folder), session);
}

export function clearSavedExamSession(folder: FolderKey): void {
  try {
    window.sessionStorage.removeItem(sessionKey(folder));
  } catch {
    /* ignore */
  }
}

export function loadSavedExamResult(runId: string): PreliPracticeResult | null {
  const r = read<PreliPracticeResult>(resultKey(runId));
  return r && Array.isArray(r.answerSheet) ? r : null;
}

type ScoreResponse = {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number;
  percent: number;
  answersVisible: boolean;
  answerSheet: Array<{
    id: string;
    selectedOptionId: string | null;
    isSkipped: boolean;
    isCorrect?: boolean;
    correctOptionId?: string | null;
    correctAnswerLabel?: string;
    explanation?: string | null;
  }>;
};

/**
 * Scores on the server (only the user's own saved MCQs count; keys only when
 * entitled — DEC-051) and stores the result in this tab for the result page.
 * The exam player records option text, so it is mapped back to option ids here.
 */
export async function submitSavedExam(input: {
  folder: FolderKey;
  title: string;
  durationMinutes: number;
  elapsedSeconds: number;
  timedOut: boolean;
  questions: SavedQuestionDetail[];
  answersByText: Record<string, string>;
}): Promise<{ attemptId: string }> {
  const answers: Record<string, string> = {};
  for (const q of input.questions) {
    const picked = input.answersByText[q.id];
    const option = picked ? q.options.find((o) => o.content === picked) : undefined;
    if (option) answers[q.id] = option.id;
  }

  const score = await apiFetch<ScoreResponse>('/bookmarks/questions/practice-score', {
    method: 'POST',
    body: JSON.stringify({ questionIds: input.questions.map((q) => q.id), answers }),
  });
  const scored = new Map(score.answerSheet.map((item) => [item.id, item]));

  const result: PreliPracticeResult = {
    setId: input.folder,
    setTitle: input.title,
    durationMinutes: input.durationMinutes,
    elapsedSeconds: input.elapsedSeconds,
    timedOut: input.timedOut,
    totalQuestions: score.totalQuestions,
    correctCount: score.correctCount,
    wrongCount: score.wrongCount,
    skippedCount: score.skippedCount,
    score: score.score,
    percent: score.percent,
    answersVisible: score.answersVisible,
    // Questions unsaved mid-exam are not scored, so they are left off the sheet too.
    answerSheet: input.questions.flatMap((q) => {
      const item = scored.get(q.id);
      if (!item) return [];
      return [
        {
          id: q.id,
          questionText: q.content?.trim() || q.title,
          options: q.options.map((o) => ({ id: o.id, label: o.label, content: o.content })),
          selectedOptionId: item.selectedOptionId,
          isSkipped: item.isSkipped,
          ...(score.answersVisible
            ? {
                correctOptionId: item.correctOptionId ?? null,
                correctAnswerLabel: item.correctAnswerLabel,
                isCorrect: item.isCorrect,
                explanation: item.explanation ?? null,
              }
            : {}),
        },
      ];
    }),
    finishedAtMs: Date.now(),
  };

  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  write(resultKey(runId), result);
  return { attemptId: runId };
}
