'use client';

import {
  WHATSAPP_INVALID_MESSAGE,
  formatWhatsappHint,
  isValidWhatsapp,
  normalizeWhatsapp,
} from '@your-academy/shared';
import { FieldHint } from '@/components/ui/field';
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
  const hint = valid ? formatWhatsappHint(trimmed) : null;
  const showError = touched && trimmed.length > 0 && valid === false;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
        aria-invalid={showError || undefined}
        className={cn(
          showError && 'border-[var(--danger)] focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(185,28,28,0.15)]',
          valid && 'border-[var(--success)]/60',
        )}
      />
      {showError ? (
        <p className="text-xs font-medium text-[var(--danger-fg)]" role="alert">
          {WHATSAPP_INVALID_MESSAGE}
        </p>
      ) : hint ? (
        <FieldHint>Will sign in as {hint}</FieldHint>
      ) : (
        <FieldHint>Country code optional — 01… and +8801… both work.</FieldHint>
      )}
    </div>
  );
}

export function toAuthWhatsappPayload(value: string): string {
  return normalizeWhatsapp(value);
}
