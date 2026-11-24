'use client';

import { AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  open: boolean;
  total: number;
  answered: number;
  marked?: number;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Shown when something is unanswered. */
  onJumpUnanswered?: () => void;
  /** Labels used when questions are unanswered (e.g. Model Test "Skip & Submit Anyway"). */
  incompleteConfirmLabel?: string;
  incompleteCancelLabel?: string;
};

/** Final-submit confirmation with answered / unanswered / marked counts. */
export function ExamSubmitDialog({
  open,
  total,
  answered,
  marked = 0,
  pending,
  onConfirm,
  onCancel,
  onJumpUnanswered,
  incompleteConfirmLabel = 'Submit anyway',
  incompleteCancelLabel = 'Keep answering',
}: Props) {
  const unanswered = Math.max(0, total - answered);
  const incomplete = unanswered > 0;

  return (
    <ConfirmDialog
      open={open}
      title="Submit your answers?"
      confirmLabel={incomplete ? incompleteConfirmLabel : 'Submit exam'}
      cancelLabel={incomplete ? incompleteCancelLabel : 'Keep reviewing'}
      pending={pending}
      onConfirm={onConfirm}
      onCancel={onCancel}
      className="sm:max-w-lg"
      description={
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[var(--radius-sm)] bg-[var(--accent-soft)] px-2 py-2.5">
              <dt className="text-[0.7rem] font-medium text-[var(--muted-strong)]">Answered</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-[var(--ink)]">
                {answered}
              </dd>
            </div>
            <div
              className={
                incomplete
                  ? 'rounded-[var(--radius-sm)] bg-[var(--danger-soft)] px-2 py-2.5'
                  : 'rounded-[var(--radius-sm)] bg-[var(--bg-muted)] px-2 py-2.5'
              }
            >
              <dt className="text-[0.7rem] font-medium text-[var(--muted-strong)]">Unanswered</dt>
              <dd
                className={
                  incomplete
                    ? 'font-display text-xl font-bold tabular-nums text-[var(--danger-fg)]'
                    : 'font-display text-xl font-bold tabular-nums text-[var(--ink)]'
                }
              >
                {unanswered}
              </dd>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-[var(--warning-soft)] px-2 py-2.5">
              <dt className="text-[0.7rem] font-medium text-[var(--muted-strong)]">Marked</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-[var(--warning-fg)]">
                {marked}
              </dd>
            </div>
          </dl>
          {incomplete ? (
            <p className="flex gap-2 text-sm text-[var(--ink-soft)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden />
              <span>
                {unanswered} of {total} question{unanswered === 1 ? ' is' : 's are'} unanswered and
                will be counted as skipped.
              </span>
            </p>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">
              All {total} questions answered. You cannot change answers after submitting.
            </p>
          )}
          {incomplete && onJumpUnanswered ? (
            <button
              type="button"
              className="cursor-pointer text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              onClick={onJumpUnanswered}
            >
              Go to first unanswered question
            </button>
          ) : null}
        </div>
      }
    />
  );
}
