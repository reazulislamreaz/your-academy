import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'motion-scale-in flex gap-3 rounded-[var(--radius)] border px-4 py-3.5 text-sm leading-relaxed font-medium shadow-[var(--shadow-sm)]',
  {
    variants: {
      variant: {
        default:
          'border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--ink-soft)]',
        danger:
          'border-[var(--danger)]/35 bg-[var(--danger-soft)] text-[var(--danger-fg)]',
        success:
          'border-[var(--success)]/35 bg-[var(--success-soft)] text-[var(--success-fg)]',
        warning:
          'border-[var(--warning)]/35 bg-[var(--warning-soft)] text-[var(--warning-fg)]',
        info: 'border-[var(--info)]/35 bg-[var(--info-soft)] text-[var(--info-fg)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const iconByVariant = {
  default: Info,
  danger: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
} as const;

type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    /** Hide the leading status icon when space is tight. */
    hideIcon?: boolean;
    icon?: ReactNode;
  };

export function Alert({
  className,
  variant = 'default',
  hideIcon,
  icon,
  children,
  ...props
}: AlertProps) {
  const key = variant ?? 'default';
  const Icon = iconByVariant[key];

  return (
    <div
      role={key === 'danger' || key === 'warning' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant: key }), className)}
      {...props}
    >
      {!hideIcon ? (
        icon ? (
          <span className="mt-0.5 shrink-0">{icon}</span>
        ) : (
          <Icon className="mt-0.5 size-5 shrink-0 opacity-95" aria-hidden />
        )
      ) : null}
      <div className="min-w-0 flex-1 [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}
