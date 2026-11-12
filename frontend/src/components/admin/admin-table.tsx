import type { ReactNode, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

type ShellProps = {
  children: ReactNode;
  className?: string;
  /** Optional sticky header bar above the scroll region */
  header?: ReactNode;
  footer?: ReactNode;
  minWidth?: string;
};

type ShellPropsExtended = ShellProps & {
  /** Hide the table body on small screens when a card list is rendered separately. */
  desktopOnly?: boolean;
};

/** Elevated table panel with horizontal scroll + shared header/cell rhythm. */
export function AdminTableShell({
  children,
  className,
  header,
  footer,
  minWidth = '40rem',
  desktopOnly = false,
}: ShellPropsExtended) {
  return (
    <Surface className={cn('overflow-hidden p-0', desktopOnly && 'hidden md:block', className)}>
      {header ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-3 sm:px-5 sm:py-3.5">
          {header}
        </div>
      ) : null}
      <div className="admin-table-scroll min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain">
        <div style={{ minWidth }}>{children}</div>
      </div>
      {footer ? (
        <div className="border-t border-[var(--line)] px-3 py-3 sm:px-5">{footer}</div>
      ) : null}
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

export function AdminTh({
  className,
  align = 'left',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    />
  );
}

export function AdminTd({
  className,
  align = 'left',
  muted,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  align?: 'left' | 'right' | 'center';
  muted?: boolean;
}) {
  return (
    <td
      className={cn(
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        muted && 'text-[var(--muted-strong)]',
        className,
      )}
      {...props}
    />
  );
}

export function AdminEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="!py-12 text-center text-sm text-[var(--muted-strong)]">
        {children}
      </td>
    </tr>
  );
}
