import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'h-11 w-full min-w-0 max-w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 text-base text-[var(--ink)] shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm',
        className,
      )}
      {...props}
    />
  );
}
