/**
 * Parse Excel sheet preamble text into structured exam information.
 * Typical shape (Bangla):
 *   পিএসসি
 *   পদের নামঃ জুনিয়র ইন্সট্রাক্টর
 *   তারিখঃ ১৮.০৩.২০২৩; সময়ঃ ২ ঘণ্টা; পূর্ণমানঃ ২০০
 */

export type ExamSchedule = {
  /** Display date, e.g. ১৮ মার্চ ২০২৩ */
  dateLabel: string;
  /** Raw date fragment when formatting fails */
  dateRaw: string | null;
  duration: string | null;
  totalMarks: string | null;
};

export type ParsedExamInfo = {
  examName: string | null;
  positionName: string | null;
  schedules: ExamSchedule[];
  /** Lines that could not be mapped into structured fields */
  leftover: string[];
  /** True when at least exam name / position / one schedule was found */
  structured: boolean;
};

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

const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
] as const;

const ASCII_TO_BN: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BN_DIGIT[d] ?? d);
}

function toBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => ASCII_TO_BN[d] ?? d);
}

function normalizeColon(raw: string): string {
  return raw.replace(/[：﹕]/g, 'ঃ').trim();
}

/** Format DD.MM.YYYY / DD-MM-YYYY / YYYY-MM-DD → Bangla long date. */
export function formatBanglaExamDate(raw: string): string | null {
  const t = toAsciiDigits(raw.trim());
  let m = t.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${toBanglaDigits(String(day))} ${BN_MONTHS[month - 1]} ${toBanglaDigits(String(year))}`;
  }
  m = t.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${toBanglaDigits(String(day))} ${BN_MONTHS[month - 1]} ${toBanglaDigits(String(year))}`;
  }
  return null;
}

function stripLabel(line: string, labels: string[]): string | null {
  const normalized = normalizeColon(line);
  for (const label of labels) {
    const re = new RegExp(`^${label}\\s*[:ঃ]?\\s*(.+)$`, 'i');
    const m = normalized.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function isScheduleLine(line: string): boolean {
  const n = normalizeColon(line).toLowerCase();
  return /তারিখ|date|সময়|সময়|time|duration|পূর্ণমান|marks|মার্ক/.test(n);
}

function isPositionLine(line: string): boolean {
  const n = normalizeColon(line);
  return /^(পদের\s*নাম|পদ|position|post)\s*[:ঃ]?/i.test(n);
}

function parseScheduleLine(line: string): ExamSchedule {
  const parts = normalizeColon(line)
    .split(/[;；|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  let dateRaw: string | null = null;
  let duration: string | null = null;
  let totalMarks: string | null = null;

  for (const part of parts) {
    const dateVal = stripLabel(part, ['তারিখ', 'date', 'exam date']);
    if (dateVal) {
      dateRaw = dateVal;
      continue;
    }
    const timeVal = stripLabel(part, ['সময়', 'সময়', 'time', 'duration']);
    if (timeVal) {
      duration = timeVal;
      continue;
    }
    const marksVal = stripLabel(part, ['পূর্ণমান', 'marks', 'total marks', 'মার্ক']);
    if (marksVal) {
      totalMarks = marksVal;
      continue;
    }
  }

  // Whole-line fallbacks if separators were missing
  if (!dateRaw) dateRaw = stripLabel(line, ['তারিখ', 'date']);
  if (!duration) duration = stripLabel(line, ['সময়', 'সময়', 'time', 'duration']);
  if (!totalMarks) totalMarks = stripLabel(line, ['পূর্ণমান', 'marks', 'total marks']);

  const dateLabel = dateRaw ? formatBanglaExamDate(dateRaw) ?? dateRaw : '—';

  return { dateLabel, dateRaw, duration, totalMarks };
}

function scheduleKey(s: ExamSchedule): string {
  return [s.dateRaw ?? s.dateLabel, s.duration ?? '', s.totalMarks ?? '']
    .map((x) => x.trim().toLowerCase())
    .join('|');
}

export function parseSheetPreamble(raw: string | null | undefined): ParsedExamInfo | null {
  if (!raw?.trim()) return null;

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  let examName: string | null = null;
  let positionName: string | null = null;
  const schedules: ExamSchedule[] = [];
  const leftover: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    if (isPositionLine(line)) {
      positionName =
        stripLabel(line, ['পদের নাম', 'পদেরনাম', 'পদ', 'position', 'post']) ?? line;
      continue;
    }
    if (isScheduleLine(line)) {
      const schedule = parseScheduleLine(line);
      const key = scheduleKey(schedule);
      if (!seen.has(key)) {
        seen.add(key);
        schedules.push(schedule);
      }
      continue;
    }
    if (!examName) {
      // First unlabeled line is the exam org / board name
      examName = stripLabel(line, ['পরীক্ষা', 'exam', 'exam name']) ?? line;
      continue;
    }
    leftover.push(line);
  }

  const structured = Boolean(examName || positionName || schedules.length > 0);
  return { examName, positionName, schedules, leftover, structured };
}
