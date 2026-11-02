import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-muted)] text-[var(--ink-soft)]',
        highlight: 'bg-[var(--highlight-soft)] text-[var(--highlight-fg)]',
        success: 'bg-[var(--success-soft)] text-[var(--success)]',
        danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
        inverse: 'bg-[var(--bg-inverse)] text-white',
        outline: 'border border-[var(--line)] text-[var(--muted-strong)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
