import { PACKAGE_DURATION_MONTHS, type PackageDuration } from '@your-academy/shared';

/** "499.00" → "৳499" / "499.50" → "৳499.50" (amounts are decimal strings, never floats). */
export function formatBdt(amount: string): string {
  const [whole, frac = '00'] = amount.split('.');
  const grouped = Number(whole).toLocaleString('en-IN');
  return `৳${grouped}${frac === '00' || frac === '0' ? '' : `.${frac.padEnd(2, '0')}`}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Same calendar-month math as the API (DEC-062 previews: "full access until …"). */
export function addMonthsIso(fromIso: string, duration: PackageDuration): string {
  const d = new Date(fromIso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + PACKAGE_DURATION_MONTHS[duration]);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}
