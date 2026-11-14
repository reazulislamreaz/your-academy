/**
 * Parse admin / Excel question dates into a UTC midnight Date + derived exam year.
 * Accepts ISO (YYYY-MM-DD), DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, and Excel Date values.
 */

const BN_DIGIT: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BN_DIGIT[d] ?? d);
}

export type ParsedQuestionDate = {
  date: Date;
  examYear: string;
  isoDate: string; // YYYY-MM-DD
};

function utcDate(y: number, m: number, d: number): ParsedQuestionDate | null {
  if (!Number.isFinite(y) || y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  const isoDate = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { date, examYear: String(y), isoDate };
}

/** Parse a free-form date string or Date into a calendar question date. */
export function parseQuestionDate(raw: string | Date | null | undefined): ParsedQuestionDate | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return utcDate(raw.getUTCFullYear(), raw.getUTCMonth() + 1, raw.getUTCDate());
  }
  const t = toAsciiDigits(String(raw).trim());
  if (!t) return null;

  // YYYY-MM-DD (optional time)
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (m) return utcDate(Number(m[1]), Number(m[2]), Number(m[3]));

  // DD/MM/YYYY | DD-MM-YYYY | DD.MM.YYYY
  m = t.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (m) return utcDate(Number(m[3]), Number(m[2]), Number(m[1]));

  // YYYY only → Jan 1
  if (/^\d{4}$/.test(t)) return utcDate(Number(t), 1, 1);

  return null;
}

/** Derive examYear string from a Date. */
export function examYearFromDate(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return String(date.getUTCFullYear());
}

export function toIsoDateString(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
