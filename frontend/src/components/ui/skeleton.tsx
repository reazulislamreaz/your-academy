import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} aria-hidden {...props} />;
}

/** Soft fade when real content replaces a skeleton block. */
export function ContentIn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('motion-content-in', className)}>{children}</div>;
}
