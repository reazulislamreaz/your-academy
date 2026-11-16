'use client';

import {
  WHATSAPP_INVALID_MESSAGE,
  isValidWhatsapp,
  normalizeWhatsapp,
} from '@your-academy/shared';
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
};

export function WhatsappField({
  id,
  value,
  onChange,
  disabled,
  autoComplete = 'tel',
  touched = false,
  className,
}: Props) {
  const trimmed = value.trim();
  const valid = trimmed.length === 0 ? null : isValidWhatsapp(trimmed);
  const showError = touched && trimmed.length > 0 && valid === false;

  return (
    <div className={cn(showError && 'space-y-1', className)}>
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
          showError &&
            'border-[var(--danger)] focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(185,28,28,0.15)]',
          valid && 'border-[var(--success)]/55',
        )}
      />
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
