'use client';

import {
  WHATSAPP_INVALID_MESSAGE,
  isValidWhatsapp,
  normalizeWhatsapp,
} from '@your-academy/shared';
import { Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoComplete?: string;
  /** Show live validation after the user has blurred or typed enough. */
  touched?: boolean;
  className?: string;
  /** Leading phone icon inside the control (auth screens). */
  showPhoneIcon?: boolean;
};

export function WhatsappField({
  id,
  value,
  onChange,
  disabled,
  autoComplete = 'tel',
  touched = false,
  className,
  showPhoneIcon = false,
}: Props) {
  const trimmed = value.trim();
  const valid = trimmed.length === 0 ? null : isValidWhatsapp(trimmed);
  const showError = touched && trimmed.length > 0 && valid === false;

  return (
    <div className={cn(showError && 'space-y-1', className)}>
      <div className={cn(showPhoneIcon && 'relative')}>
        {showPhoneIcon ? (
          <Phone
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]"
            aria-hidden
            strokeWidth={2}
          />
        ) : null}
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder="01XXXXXXXXX"
          aria-invalid={showError || undefined}
          className={cn(
            'auth-input',
            showPhoneIcon && 'pl-10',
            showError &&
              'border-[var(--danger)] focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(185,28,28,0.15)]',
            valid && 'border-[var(--success)]/55',
          )}
        />
      </div>
      {showError ? (
        <p className="text-[0.6875rem] font-medium text-[var(--danger-fg)]" role="alert">
          {WHATSAPP_INVALID_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}

export function toAuthWhatsappPayload(value: string): string {
  return normalizeWhatsapp(value);
}
