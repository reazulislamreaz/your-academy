import { Lock } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export const ANSWERS_LOCKED_MESSAGE = 'Answers are available with a subscription';

/**
 * DEC-051: the API omits answer keys / explanations for non-entitled viewers.
 * UI hint only — the backend is the security boundary.
 */
export function AnswersLockedNote({
  variant = 'banner',
  detail,
  className,
}: {
  /** `banner` above a list / result; `inline` inside a single card. */
  variant?: 'banner' | 'inline';
  /** Extra sentence for the banner variant. */
  detail?: string;
  className?: string;
}) {
  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-strong)]',
          className,
        )}
      >
        <Lock className="size-3.5" aria-hidden />
        {ANSWERS_LOCKED_MESSAGE}
      </span>
    );
  }
  return (
    <Alert
      variant="info"
      icon={<Lock className="size-4" aria-hidden />}
      className={className}
    >
      {ANSWERS_LOCKED_MESSAGE}.{detail ? ` ${detail}` : null}
    </Alert>
  );
}
