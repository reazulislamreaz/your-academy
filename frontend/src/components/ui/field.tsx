import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type FieldProps = {
  children: ReactNode;
  className?: string;
};

export function Field({ children, className }: FieldProps) {
  return <div className={cn('space-y-2', className)}>{children}</div>;
}

type FieldHintProps = {
  children: ReactNode;
  className?: string;
};

export function FieldHint({ children, className }: FieldHintProps) {
  return (
    <p className={cn('text-sm leading-relaxed text-[var(--muted-strong)]', className)}>
      {children}
    </p>
  );
}
