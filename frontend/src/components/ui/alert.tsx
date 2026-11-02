import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-[var(--radius)] border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink-soft)]',
      danger: 'border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]',
      success: 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success)]',
      warning: 'border-[var(--highlight)]/40 bg-[var(--highlight-soft)] text-[var(--highlight-fg)]',
      info: 'border-[var(--info)]/25 bg-[var(--info-soft)] text-[var(--info)]',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Alert({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="status" className={cn(alertVariants({ variant }), className)} {...props} />;
}
