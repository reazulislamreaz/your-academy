'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string;
};

export function PasswordField({ className, inputClassName, id, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', inputClassName)}
        {...props}
      />
      <button
        type="button"
        className="absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
