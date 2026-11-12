'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export const DEFAULT_AVATAR_SRC = '/images/default-avatar.svg';

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClass = {
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-10',
} as const;

/** Compact circular avatar — uploaded photo, else default user picture. */
export function UserAvatar({ name, avatarUrl, size = 'md', className }: UserAvatarProps) {
  const dim = size === 'sm' ? 32 : size === 'md' ? 36 : 40;
  const [failed, setFailed] = useState(false);
  const src = avatarUrl && !failed ? avatarUrl : DEFAULT_AVATAR_SRC;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- signed Cloudinary URL or local default SVG
    <img
      src={src}
      alt={name ? `${name} profile` : 'User profile'}
      width={dim}
      height={dim}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(
        sizeClass[size],
        'shrink-0 rounded-full object-cover ring-1 ring-[var(--line-strong)] bg-[var(--accent-soft)]',
        className,
      )}
    />
  );
}
