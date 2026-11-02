/** Normalize to E.164-like form: leading +, digits only after. */
export function normalizeWhatsapp(input: string): string {
  const trimmed = input.trim().replace(/[\s\-()]/g, '');
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  }
  return `+${trimmed.replace(/\D/g, '')}`;
}

export function isValidWhatsapp(normalized: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}
