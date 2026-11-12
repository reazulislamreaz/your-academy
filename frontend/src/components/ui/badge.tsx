import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[var(--radius-sm)] px-2.5 py-1 text-[13px] leading-none font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-muted)] text-[var(--ink-soft)]',
        highlight: 'bg-[var(--highlight-soft)] text-[var(--highlight)]',
        success: 'bg-[var(--success-soft)] text-[var(--success-fg)]',
        danger: 'bg-[var(--danger-soft)] text-[var(--danger-fg)]',
        warning: 'bg-[var(--warning-soft)] text-[var(--warning-fg)]',
        info: 'bg-[var(--info-soft)] text-[var(--info-fg)]',
        /** Learning insight / marked for review */
        insight: 'bg-[var(--insight-soft)] text-[var(--insight-fg)]',
        /** Saved / bookmarked MCQ */
        bookmark: 'bg-[var(--bookmark-soft)] text-[var(--bookmark-fg)]',
        inverse: 'bg-[var(--bg-inverse)] text-[var(--bg)]',
        outline: 'border border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--muted-strong)]',
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

export { badgeVariants };
