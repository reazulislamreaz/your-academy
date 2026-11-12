import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-3 text-base text-[var(--ink)] shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm',
        className,
      )}
      {...props}
    />
  );
}
