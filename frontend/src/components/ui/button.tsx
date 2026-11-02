import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'motion-press inline-flex items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-semibold transition-[background-color,color,box-shadow,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--highlight)] text-[var(--highlight-fg)] shadow-[var(--shadow-sm)] hover:brightness-105',
        secondary:
          'bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-sm)] hover:brightness-110',
        outline:
          'border border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--bg-muted)]',
        ghost: 'bg-transparent text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
        danger: 'bg-[var(--danger)] text-white hover:brightness-110',
        soft: 'bg-[var(--highlight-soft)] text-[var(--highlight-fg)] hover:bg-[var(--highlight-hover)]',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4',
        lg: 'h-12 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

export { buttonVariants };
