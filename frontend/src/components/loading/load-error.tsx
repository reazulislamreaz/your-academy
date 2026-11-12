import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  children?: ReactNode;
};

/** Failed fetch — never leave an infinite skeleton spinning. */
export function LoadError({
  message = 'Something went wrong while loading.',
  onRetry,
  retryLabel = 'Try again',
  className,
  children,
}: Props) {
  return (
    <Alert variant="danger" className={className}>
      <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between')}>
        <div className="min-w-0">
          <p>{message}</p>
          {children}
        </div>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry} className="shrink-0">
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </Alert>
  );
}
