import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

type Props = {
  variant?: 'locked' | 'practice' | 'info';
  title: string;
  description: string;
  className?: string;
  actions?: ReactNode;
};

export function EntitlementCallout({
  variant = 'info',
  title,
  description,
  className,
  actions,
}: Props) {
  if (variant === 'locked') {
    return (
      <Surface
        className={cn(
          'motion-rise space-y-3 border-l-[3px] border-l-[var(--highlight)] p-5 sm:p-6',
          className,
        )}
        role="status"
      >
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Premium answers
        </p>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        {actions ?? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/home">
              <Button size="sm" variant="soft">
                View access
              </Button>
            </Link>
            <Link href="/questions">
              <Button size="sm" variant="ghost">
                Keep browsing
              </Button>
            </Link>
          </div>
        )}
      </Surface>
    );
  }

  return (
    <Alert
      variant={variant === 'practice' ? 'default' : 'info'}
      className={cn(className)}
    >
      <p className="font-semibold text-[var(--ink)]">{title}</p>
      <p className="mt-1 text-[var(--muted-strong)]">{description}</p>
      {actions ? <div className="mt-3">{actions}</div> : null}
    </Alert>
  );
}
