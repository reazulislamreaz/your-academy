'use client';

import { useState, type ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';

type Props = Omit<ButtonProps, 'onClick'> & {
  confirmMessage: string;
  onConfirm: () => void | Promise<unknown>;
  children: ReactNode;
};

/** Lightweight confirm before destructive actions (no modal dependency). */
export function ConfirmButton({
  confirmMessage,
  onConfirm,
  children,
  disabled,
  ...props
}: Props) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      {...props}
      disabled={disabled || pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        setPending(true);
        void Promise.resolve(onConfirm()).finally(() => setPending(false));
      }}
    >
      {pending ? 'Working…' : children}
    </Button>
  );
}
