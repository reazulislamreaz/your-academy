import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Delay between each child enter (ms). */
  stepMs?: number;
};

/** Staggered soft-float enter for dashboard cards / lists (CSS nth-child delays). */
export function Stagger({ children, className, stepMs = 55, style, ...props }: Props) {
  return (
    <div
      className={cn('motion-stagger', className)}
      style={{ ...style, ['--stagger-step' as string]: `${stepMs}ms` } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
