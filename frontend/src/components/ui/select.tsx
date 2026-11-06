import type { CSSProperties, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const chevron: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' stroke='%235C6B7A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
};

export function Select({
  className,
  children,
  style,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full appearance-none rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] bg-[length:12px] bg-[position:right_0.9rem_center] bg-no-repeat px-3.5 pr-10 text-sm text-[var(--ink)] shadow-[var(--shadow-sm)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus:border-[var(--highlight)] focus:shadow-[0_0_0_3px_var(--highlight-soft)] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      style={{ ...chevron, ...style }}
      {...props}
    >
      {children}
    </select>
  );
}
