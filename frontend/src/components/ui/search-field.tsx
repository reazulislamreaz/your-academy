'use client';

import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/utils';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  /** Visual density / shape. Default matches admin/list toolbars. */
  variant?: 'default' | 'pill' | 'header';
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * Consistent search input: leading icon, optional clear (X), no submit button.
 * Pair with `useDebouncedValue` for automatic list filtering.
 */
export function SearchField({
  value,
  onChange,
  onClear,
  variant = 'default',
  className,
  inputRef,
  disabled,
  ...props
}: Props) {
  const clear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div
      className={cn(
        'relative min-w-0',
        variant === 'header' && 'w-full',
        className,
      )}
    >
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]',
          variant === 'pill' ? 'left-4' : 'left-3',
        )}
        aria-hidden
        strokeWidth={1.75}
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full min-w-0 border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink)] outline-none',
          'placeholder:text-[var(--muted-strong)]',
          'transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          'focus:border-[var(--accent)] focus:bg-[var(--bg-elevated)] focus:shadow-[var(--focus-ring)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          // Hide native search clear so we use a consistent X control.
          '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
          variant === 'default' &&
            'ya-control h-10 rounded-[var(--radius)] py-0 pr-10 pl-9 text-base shadow-[var(--shadow-sm)] sm:text-sm',
          variant === 'pill' &&
            'min-h-12 rounded-full py-2 pr-11 pl-11 text-sm leading-normal',
          variant === 'header' &&
            'h-10 rounded-full py-0 pr-10 pl-9 text-sm',
        )}
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          disabled={disabled}
          className={cn(
            'absolute top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full',
            'text-[var(--muted)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]',
            'disabled:pointer-events-none',
            variant === 'pill' ? 'right-3 size-7' : 'right-2 size-7',
          )}
          onClick={clear}
        >
          <X className="size-3.5" aria-hidden strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
