/**
 * Support WhatsApp number (digits with country code, e.g. 8801XXXXXXXXX) from
 * NEXT_PUBLIC_SUPPORT_WHATSAPP. Returns null when unset so callers can hide the button.
 */
export function supportWhatsappNumber(): string | null {
  const digits = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

/** wa.me link with a prefilled message; `number` defaults to the support line. */
export function whatsappLink(message: string, number: string | null = supportWhatsappNumber()): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
