import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'ya-control w-full min-w-0 max-w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 text-base leading-normal text-[var(--ink)] shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)] placeholder:text-[var(--muted)] hover:border-[var(--line-strong)] focus:border-[var(--accent)] focus:bg-[var(--bg-elevated)] focus:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm',
        className,
      )}
      {...props}
    />
  );
}
