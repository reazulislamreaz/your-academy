/**
 * Bangladesh WhatsApp / mobile helpers (DEC register + login identity).
 * Canonical storage form: +8801[3-9]XXXXXXXX (E.164).
 */

/** Operator prefixes after the leading 0 / country code. */
export const BD_MOBILE_OPERATOR_PREFIXES = [
  '013',
  '014',
  '015',
  '016',
  '017',
  '018',
  '019',
] as const;

const BD_E164_RE = /^\+8801[3-9]\d{8}$/;

export const WHATSAPP_INVALID_MESSAGE =
  'Enter a valid Bangladeshi mobile number (e.g. 017XXXXXXXX or +88017XXXXXXXX).';

function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Normalize user input to +8801XXXXXXXXX when possible.
 * Accepts: 01…, +8801…, 8801…, 008801…
 * Always returns a +prefixed digit string (may still be invalid — use isValidWhatsapp).
 */
export function normalizeWhatsapp(input: string): string {
  const trimmed = input.trim().replace(/[\s\-().]/g, '');
  let digits = trimmed.startsWith('+')
    ? digitsOnly(trimmed.slice(1))
    : digitsOnly(trimmed);

  // International 00 prefix → drop leading 00
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Local national format: 01XXXXXXXXX (11 digits)
  if (/^01[3-9]\d{8}$/.test(digits)) {
    digits = `880${digits.slice(1)}`;
  }

  // National significant number without trunk 0: 1XXXXXXXXX (10 digits)
  if (/^1[3-9]\d{8}$/.test(digits)) {
    digits = `880${digits}`;
  }

  return digits ? `+${digits}` : '+';
}

/** True when input normalizes to a valid BD mobile E.164 number. */
export function isValidWhatsapp(input: string): boolean {
  return BD_E164_RE.test(normalizeWhatsapp(input));
}

/** Format for display hints (does not mutate storage). */
export function formatWhatsappHint(input: string): string | null {
  if (!isValidWhatsapp(input)) return null;
  return normalizeWhatsapp(input);
}
