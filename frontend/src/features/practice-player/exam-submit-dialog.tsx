'use client';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  open: boolean;
  answered: number;
  unanswered: number;
  marked: number;
  total: number;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onJumpUnanswered?: () => void;
};

export function ExamSubmitDialog({
  open,
  answered,
  unanswered,
  marked,
  total,
  pending,
  onConfirm,
  onCancel,
  onJumpUnanswered,
}: Props) {
  return (
    <ConfirmDialog
      open={open}
      title="Submit exam?"
      confirmLabel={pending ? 'Submitting…' : 'Submit exam'}
      cancelLabel="Keep answering"
      pending={pending}
      onConfirm={onConfirm}
      onCancel={onCancel}
      description={
        <div className="space-y-3 text-sm text-[var(--muted-strong)]">
          <p>Review your progress before final submission. This cannot be undone.</p>
          <ul className="space-y-1 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--bg-muted)]/50 px-3 py-2.5">
            <li className="flex justify-between gap-2">
              <span>Answered</span>
              <strong className="tabular-nums text-[var(--ink)]">
                {answered}/{total}
              </strong>
            </li>
            <li className="flex justify-between gap-2">
              <span>Unanswered</span>
              <strong className="tabular-nums text-[var(--ink)]">{unanswered}</strong>
            </li>
            <li className="flex justify-between gap-2">
              <span>Marked for review</span>
              <strong className="tabular-nums text-[var(--ink)]">{marked}</strong>
            </li>
          </ul>
          {unanswered > 0 && onJumpUnanswered ? (
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
