import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { InlineLoader } from '@/components/loading/inline-loader';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'motion-press inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-semibold transition-[background-color,color,box-shadow,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--highlight)] text-[var(--highlight-fg)] shadow-[var(--shadow-sm)] hover:brightness-105 hover:shadow-[var(--shadow)]',
        secondary:
          'bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-sm)] hover:brightness-110 hover:shadow-[var(--shadow)]',
        outline:
          'border border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--bg-muted)] hover:shadow-[var(--shadow-sm)]',
        ghost: 'bg-transparent text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
        danger: 'bg-[var(--danger)] text-white hover:brightness-110 hover:shadow-[var(--shadow)]',
        soft: 'bg-[var(--highlight-soft)] text-[var(--highlight)] hover:bg-[var(--highlight-hover)]',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4',
        lg: 'h-12 px-5 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Shows inline loader and disables the control */
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <InlineLoader /> : null}
      {children}
    </button>
  );
});

export { buttonVariants };
