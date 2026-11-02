import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
};

export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50',
        variant === 'primary' && 'bg-[var(--accent)] text-white hover:brightness-110',
        variant === 'ghost' && 'border border-[var(--line)] bg-white/70 hover:bg-white',
        variant === 'danger' && 'bg-[var(--danger)] text-white',
        className,
      )}
      {...props}
    />
  );
}
