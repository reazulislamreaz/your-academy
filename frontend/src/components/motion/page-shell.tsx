'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Extra class applied to the animated shell (default motion-page). */
  motionClassName?: string;
};

/**
 * Re-triggers a short enter animation on client navigations within a layout.
 * Duration stays under --duration so routes never feel delayed.
 */
export function PageShell({ children, className, motionClassName = 'motion-page' }: Props) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={cn(motionClassName, className)}>
      {children}
    </div>
  );
}
