/** "someone@gmail.com" → "so***@gmail.com" — enough for the owner to recognise, not to harvest. */
export function maskEmailForNotice(address: string): string {
  const [local, domain] = address.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}
