import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { InlineLoader } from '@/components/loading/inline-loader';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'motion-press inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-semibold leading-normal transition-[background-color,color,box-shadow,opacity,transform,filter] duration-[var(--duration-fast)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--highlight)] text-[var(--highlight-fg)] shadow-[var(--shadow-sm)] hover:brightness-[1.06] hover:shadow-[var(--shadow)] active:brightness-95',
        secondary:
          'bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-sm)] hover:brightness-110 hover:shadow-[var(--shadow)] active:brightness-95',
        outline:
          'border border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--ink)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-muted)] hover:shadow-[var(--shadow-sm)]',
        ghost: 'bg-transparent text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
        danger: 'bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:brightness-110 hover:shadow-[var(--shadow)]',
        soft: 'bg-[var(--highlight-soft)] text-[var(--highlight)] hover:bg-[var(--highlight-hover)]',
      },
      size: {
        /* min-height + py so Bengali matras are not clipped */
        sm: 'min-h-9 px-3.5 py-1.5 text-xs',
        md: 'min-h-11 px-4.5 py-2',
        lg: 'min-h-12 px-6 py-2.5 text-base',
        icon: 'min-h-11 min-w-11 p-2',
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
