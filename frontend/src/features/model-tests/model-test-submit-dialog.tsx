'use client';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  open: boolean;
  unanswered: number;
  total: number;
  pending?: boolean;
  onSkipAndSubmit: () => void;
  onGoBack: () => void;
};

/** Incomplete submission confirmation for Model Tests. */
export function ModelTestSubmitDialog({
  open,
  unanswered,
  total,
  pending,
  onSkipAndSubmit,
  onGoBack,
}: Props) {
  return (
    <ConfirmDialog
      open={open}
      title="Unanswered questions"
      confirmLabel={pending ? 'Submitting…' : 'Skip & Submit Anyway'}
      cancelLabel="Go Back & Complete"
      pending={pending}
      onConfirm={onSkipAndSubmit}
      onCancel={onGoBack}
      className="sm:max-w-lg"
      description={
        <div className="space-y-3 text-sm text-[var(--muted-strong)]">
          <p>
            You still have{' '}
            <strong className="tabular-nums text-[var(--ink)]">{unanswered}</strong> unanswered
            question{unanswered === 1 ? '' : 's'} out of{' '}
            <strong className="tabular-nums text-[var(--ink)]">{total}</strong>.
          </p>
          <p>Submit now with blanks counted as skipped, or go back and finish answering.</p>
        </div>
      }
    />
  );
}
