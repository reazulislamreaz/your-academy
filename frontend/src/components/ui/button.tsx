import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { InlineLoader } from '@/components/loading/inline-loader';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'ya-btn-sweep motion-press relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden',
    'rounded-[var(--radius)] text-sm font-semibold leading-normal',
    'transition-[color,box-shadow,opacity,transform,filter,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'ya-btn-sweep--primary bg-[var(--highlight)] text-[var(--highlight-fg)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] active:brightness-95',
        secondary:
          'ya-btn-sweep--secondary bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] active:brightness-95',
        outline:
          'ya-btn-sweep--outline border border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--ink)] hover:border-[var(--accent)]/50 hover:bg-[var(--brand-wash)] hover:text-[var(--ink)] hover:shadow-[var(--shadow-sm)]',
        ghost:
          'ya-btn-sweep--ghost bg-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]',
        danger:
          'ya-btn-sweep--danger bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]',
        soft:
          'ya-btn-sweep--soft bg-[var(--highlight-soft)] text-[var(--highlight)] hover:text-[var(--highlight)]',
      },
      size: {
        /* Touch-friendly ≥44px; py keeps Bengali matras from clipping */
        sm: 'min-h-11 px-3.5 py-1.5 text-sm',
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
      {/* Keep label/icons above the sliding sweep layer */}
      <span className="relative z-[1] inline-flex items-center justify-center gap-2">
        {loading ? <InlineLoader /> : null}
        {children}
      </span>
    </button>
  );
});

export { buttonVariants };
