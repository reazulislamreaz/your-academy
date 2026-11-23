'use client';

import Link from 'next/link';
import { LayoutDashboard, List, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AnswersLockedNote } from '@/components/marketing/answers-locked-note';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/use-auth';
import { GuestRegisterCta } from '@/features/guest-exams/guest-register-cta';
import {
  saveGuestResultLink,
  type GuestResultLink,
} from '@/features/guest-exams/guest-result-link';
import { AnswerReview, type ReviewItem } from './answer-review';
import { optionLabelAt } from './option-labels';
import { ResultSummary } from './result-summary';

type SheetItem = {
  id: string;
  questionText: string;
  options: string[];
  selectedAnswer: string | null;
  isSkipped: boolean;
  correctAnswer?: string;
  explanation?: string | null;
  isCorrect?: boolean;
};

type Props = {
  kind: GuestResultLink['kind'];
  kindLabel: string;
  title: string;
  slug: string;
  attemptId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
  timedOut: boolean;
  elapsedSeconds: number | null;
  durationInMinutes: number;
  submittedAt: string;
  answersVisible: boolean;
  answerSheet: SheetItem[];
  optionLabels: readonly string[];
  /** Listing / take prefix, e.g. `/exams` or `/live-model-tests`. */
  takeBase: string;
  listLabel: string;
  crossLink: { href: string; label: string };
  tags?: string[];
};

/** Result + review for public Quiz / Model Test attempts (DEC-039/040/045/051). */
export function TimedResultView(props: Props) {
  const {
    kind,
    kindLabel,
    title,
    slug,
    attemptId,
    userName,
    score,
    totalQuestions,
    correctCount,
    wrongCount,
    skippedCount,
    percent,
    timedOut,
    elapsedSeconds,
    durationInMinutes,
    submittedAt,
    answerSheet,
    optionLabels,
    takeBase,
    listLabel,
    crossLink,
    tags = [],
  } = props;
  const me = useMe();
  // Server render has no session state; decide guest-only UI after mount to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isGuest = mounted && !me.data && !me.isLoading;
  // DEC-051: non-entitled viewers get score + own selections only.
  const answersVisible = props.answersVisible !== false;
  const resultPath = `${takeBase}/${encodeURIComponent(slug)}/result/${encodeURIComponent(attemptId)}`;

  const link = useMemo<Omit<GuestResultLink, 'savedAtMs'>>(
    () => ({ kind, attemptId, resultPath, title, score, totalQuestions, percent, userName }),
    [attemptId, kind, percent, resultPath, score, title, totalQuestions, userName],
  );

  // Persist guest pointer as soon as the result loads so register (any entry) can claim it.
  useEffect(() => {
    if (!isGuest) return;
    saveGuestResultLink({ ...link, savedAtMs: Date.now() });
  }, [isGuest, link]);

  const reviewItems = useMemo<ReviewItem[]>(
    () =>
      answerSheet.map((item, index) => {
        const selectedIndex =
          item.selectedAnswer != null ? item.options.indexOf(item.selectedAnswer) : -1;
        return {
          id: item.id,
          number: index + 1,
          text: item.questionText,
          options: item.options.map((opt, i) => ({
            key: String(i),
            label: optionLabelAt(optionLabels, i),
            content: opt,
            // Key comes from the API only for entitled viewers.
            isCorrect:
              answersVisible && item.correctAnswer != null ? item.correctAnswer === opt : undefined,
          })),
          selectedKey: selectedIndex >= 0 ? String(selectedIndex) : null,
          isSkipped: item.isSkipped,
          isCorrect: answersVisible ? item.isCorrect : undefined,
          explanation: answersVisible ? item.explanation : undefined,
        };
      }),
    [answerSheet, answersVisible, optionLabels],
  );

  const submitted = new Date(submittedAt);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 overflow-x-clip px-3 py-6 sm:space-y-6 sm:px-6 sm:py-10">
      <ResultSummary
        eyebrow={`${kindLabel} result`}
        title={title}
        meta={
          <>
            <span className="font-semibold text-[var(--ink)]">{userName}</span>
            {Number.isNaN(submitted.getTime()) ? null : (
              <>
                {' · '}
                {/* SSR timezone/locale differs from the browser's. */}
                <time dateTime={submittedAt} suppressHydrationWarning>
                  {submitted.toLocaleString()}
                </time>
              </>
            )}
          </>
        }
        badges={
          <>
            {tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
            {timedOut ? <Badge variant="warning">Auto-submitted at time-out</Badge> : null}
          </>
        }
        percent={percent}
        score={score}
        scoreOutOf={totalQuestions}
        scoreCaption="Score"
        correct={correctCount}
        wrong={wrongCount}
        skipped={skippedCount}
        total={totalQuestions}
        timeTakenSeconds={elapsedSeconds}
        timeLimitSeconds={durationInMinutes * 60}
        actions={
          <>
            <Link href={`${takeBase}/${slug}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <RotateCcw className="size-4" aria-hidden />
                Retake
              </Button>
            </Link>
            <Link href={takeBase} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <List className="size-4" aria-hidden />
                {listLabel}
              </Button>
            </Link>
            <Link href={crossLink.href} className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                {crossLink.label}
              </Button>
            </Link>
            {!isGuest ? (
              <Link href="/home" className="w-full sm:w-auto">
                <Button variant="ghost" className="w-full sm:w-auto">
                  <LayoutDashboard className="size-4" aria-hidden />
                  Dashboard
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      {isGuest ? <GuestRegisterCta link={link} /> : null}

      <AnswerReview
        items={reviewItems}
        answersVisible={answersVisible}
        lockedNote={
          answersVisible ? null : (
            <AnswersLockedNote detail="Your score and selected answers are shown below." />
          )
        }
      />
    </div>
  );
}
