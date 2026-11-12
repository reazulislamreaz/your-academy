import type { ReactNode, TableHTMLAttributes } from 'react';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

type ShellProps = {
  children: ReactNode;
  className?: string;
  /** Optional sticky header bar above the scroll region */
  header?: ReactNode;
  minWidth?: string;
};

/** Elevated table panel with horizontal scroll + shared header/cell rhythm. */
export function AdminTableShell({ children, className, header, minWidth = '40rem' }: ShellProps) {
  return (
    <Surface className={cn('overflow-hidden p-0', className)}>
      {header ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
          {header}
        </div>
      ) : null}
      <div className="min-w-0 w-full max-w-full overflow-x-auto">
        <div style={{ minWidth }}>{children}</div>
      </div>
    </Surface>
  );
}

export function AdminTable({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('admin-table w-full text-left text-sm', className)}
      {...props}
    />
  );
}
