'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LearnerThemePortal } from '@/components/theme/learner-theme-portal';
import { ExamProgressCard } from './exam-progress-card';
import { ExamQuestionNavigator } from './exam-question-navigator';

type Props = {
  open: boolean;
  onClose: () => void;
  total: number;
  currentIndex: number;
  answers: Record<string, string>;
  marked: Record<string, boolean>;
  questionIds: string[];
  answered: number;
  unanswered: number;
  markedCount: number;
  onJump: (index: number) => void;
};

/** Mobile/tablet bottom sheet for question grid + progress. */
export function ExamNavigatorSheet({
  open,
  onClose,
  total,
  currentIndex,
  answers,
  marked,
  questionIds,
  answered,
  unanswered,
  markedCount,
  onJump,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return (
    <LearnerThemePortal>
      <div
        className="fixed inset-0 z-40 lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Question navigator"
      >
        <button
          type="button"
          className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)] backdrop-blur-[1px]"
          aria-label="Close navigator"
          onClick={onClose}
        />
        <div className="motion-drawer-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[1.25rem] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--ink)] shadow-[var(--shadow-lg)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-display text-base font-semibold text-[var(--ink)]">Questions</p>
            <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
              <X className="size-5" />
            </Button>
          </div>
          <div className="space-y-4">
            <ExamProgressCard
              total={total}
              answered={answered}
              unanswered={unanswered}
              marked={markedCount}
              className="shadow-none"
            />
            <ExamQuestionNavigator
              total={total}
              currentIndex={currentIndex}
              answers={answers}
              marked={marked}
              questionIds={questionIds}
              onJump={(i) => {
                onJump(i);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </LearnerThemePortal>
  );
}
