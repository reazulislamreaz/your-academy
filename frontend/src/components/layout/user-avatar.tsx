'use client';

import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

function initialsFromName(name: string): string {
  const parts = name
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClass = {
  sm: 'size-8 text-[0.65rem]',
  md: 'size-9 text-xs',
  lg: 'size-10 text-sm',
} as const;

/** Compact circular avatar with image or initials fallback. */
export function UserAvatar({ name, avatarUrl, size = 'md', className }: UserAvatarProps) {
  const dim = size === 'sm' ? 32 : size === 'md' ? 36 : 40;

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Cloudinary URL
      <img
        src={avatarUrl}
        alt=""
        width={dim}
        height={dim}
        decoding="async"
        className={cn(
          sizeClass[size],
          'shrink-0 rounded-full object-cover ring-1 ring-[var(--line-strong)]',
          className,
        )}
      />
    );
  }

  const initials = initialsFromName(name);
  return (
    <span
      aria-hidden
      className={cn(
        sizeClass[size],
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-[var(--accent-soft)] font-semibold tracking-wide text-[var(--accent)]',
        'ring-1 ring-[var(--line-strong)]',
        className,
      )}
    >
      {initials.length ? initials : <UserRound className="size-4" />}
    </span>
  );
}
