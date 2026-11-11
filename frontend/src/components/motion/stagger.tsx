import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Delay between each child enter (ms). */
  stepMs?: number;
};

/** Staggered rise for a short list of children (CSS nth-child delays). */
export function Stagger({ children, className, stepMs = 45, style, ...props }: Props) {
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
