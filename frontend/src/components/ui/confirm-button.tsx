'use client';

import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = Omit<ButtonProps, 'onClick'> & {
  confirmMessage: string;
  confirmTitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  reversible?: boolean;
  onConfirm: () => void | Promise<unknown>;
  children: ReactNode;
};

/** Confirm before destructive actions via accessible modal (not window.confirm). */
export function ConfirmButton({
  confirmMessage,
  confirmTitle = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  reversible,
  onConfirm,
  children,
  disabled,
  ...props
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button
        {...props}
        disabled={disabled || pending}
        onClick={(e) => {
          // Keep parent click handlers (e.g. overflow menus) from unmounting this dialog.
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {pending ? 'Working…' : children}
      </Button>
      <ConfirmDialog
        open={open}
        title={confirmTitle}
        description={confirmMessage}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        destructive={destructive}
        reversible={reversible}
        pending={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          setPending(true);
          void Promise.resolve(onConfirm())
            .then(() => setOpen(false))
            .finally(() => setPending(false));
        }}
      />
    </>
  );
}
