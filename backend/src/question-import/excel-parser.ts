import { Readable } from 'stream';
import ExcelJS from 'exceljs';

/**
 * Canonical Google Sheets MCQ template (Bangla).
 * Reference: docs.google.com/spreadsheets/d/1DSgHK73WHMZhRL2yz8qhH3hTdfopT7RK
 *
 * Columns:
 *   প্রশ্ন নং | প্রশ্ন | পরীক্ষার নাম ও সাল | ক | খ | গ | ঘ | উত্তর
 *
 * Subject / Topic / Difficulty are supplied via upload collection metadata
 * (or optional English alias columns if present).
 */
export const TEMPLATE_HEADERS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'পরীক্ষার নাম ও সাল',
  'ক',
  'খ',
  'গ',
  'ঘ',
  'উত্তর',
] as const;

export type ParsedImportRow = {
  rowNumber: number;
  serial: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: string;
  examCategory: string;
  examYear: string;
  source: string;
};

type FieldKey = keyof Omit<ParsedImportRow, 'rowNumber'>;

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim();
  }
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((p) => p.text).join('').trim();
  }
  if (typeof value === 'object' && 'result' in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function normalizeHeader(h: string): string {
  return h
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[:：]+$/g, '');
}

/** Map header labels (Bangla + English aliases) → parsed field. */
const HEADER_ALIASES: Record<string, FieldKey> = {
  // Bangla Google Sheets template
  'প্রশ্ন নং': 'serial',
  'প্রশ্ন নম্বর': 'serial',
  'ক্রমিক': 'serial',
  প্রশ্ন: 'question',
  'প্রশ্নের বিবরণ': 'question',
  'পরীক্ষার নাম ও সাল': 'examCategory',
  'পরীক্ষার নাম': 'examCategory',
  'পরীক্ষা': 'examCategory',
  ক: 'optionA',
  খ: 'optionB',
  গ: 'optionC',
  ঘ: 'optionD',
  উত্তর: 'correctAnswer',
  'সঠিক উত্তর': 'correctAnswer',
  ব্যাখ্যা: 'explanation',
  বিষয়: 'subject',
  বিষয়: 'subject',
  টপিক: 'topic',
  অধ্যায়: 'topic',
  অধ্যায়: 'topic',
  কঠিনত্ব: 'difficulty',
  'কঠিনতার মাত্রা': 'difficulty',
  উৎস: 'source',

  // English / legacy aliases (accepted on upload, not on downloadable template)
  'sl': 'serial',
  'sl no': 'serial',
  'sl.': 'serial',
  'serial': 'serial',
  'no': 'serial',
  'question no': 'serial',
  'question number': 'serial',
  question: 'question',
  'option a': 'optionA',
  'option b': 'optionB',
  'option c': 'optionC',
  'option d': 'optionD',
  a: 'optionA',
  b: 'optionB',
  c: 'optionC',
  d: 'optionD',
  'correct answer': 'correctAnswer',
  answer: 'correctAnswer',
  explanation: 'explanation',
  subject: 'subject',
  topic: 'topic',
  difficulty: 'difficulty',
  'exam category': 'examCategory',
  'exam name': 'examCategory',
  'exam name & year': 'examCategory',
  'exam name and year': 'examCategory',
  'exam year': 'examYear',
  year: 'examYear',
  source: 'source',
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

export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BN_DIGIT[d] ?? d);
}

/** Normalize উত্তর / Correct Answer → A|B|C|D. */
export function normalizeCorrectAnswer(raw: string): string | null {
  const v = raw.normalize('NFC').trim();
  if (!v) return null;
  const compact = v.replace(/[.\s)）\]】]+$/g, '').replace(/^[(\[【]+/, '');
  const upper = compact.toUpperCase();
  const map: Record<string, string> = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',
    ক: 'A',
    খ: 'B',
    গ: 'C',
    ঘ: 'D',
    '১': 'A',
    '২': 'B',
    '৩': 'C',
    '৪': 'D',
  };
  if (map[compact]) return map[compact];
  if (map[upper]) return map[upper];
  // "Option A" / "উত্তর: খ"
  const letter = compact.match(/(?:^|[\s:])([ABCDকখগঘ])$/i)?.[1];
  if (letter) return map[letter] ?? map[letter.toUpperCase()] ?? null;
  return null;
}

/** Split "পরীক্ষার নাম ও সাল" into exam label + year when a trailing year is present. */
export function splitExamNameAndYear(raw: string): { examCategory: string; examYear: string } {
  const t = raw.normalize('NFC').trim();
  if (!t) return { examCategory: '', examYear: '' };

  const m = t.match(/^(.*?)(?:[:：\-–—]\s*|\s+)([0-9০-৯]{2,4})\s*$/);
  if (m && m[1].trim()) {
    return {
      examCategory: m[1].trim(),
      examYear: toAsciiDigits(m[2]),
    };
  }
  return { examCategory: t, examYear: '' };
}

function isCsvUpload(filename: string, mimeType: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.csv') || mimeType.includes('csv') || mimeType === 'text/plain';
}

function emptyParsed(rowNumber: number): ParsedImportRow {
  return {
    rowNumber,
    serial: '',
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
    explanation: '',
    subject: '',
    topic: '',
    difficulty: '',
    examCategory: '',
    examYear: '',
    source: '',
  };
}

function scoreHeaderRow(values: string[]): {
  score: number;
  colMap: Map<number, FieldKey>;
} {
  const colMap = new Map<number, FieldKey>();
  const used = new Set<FieldKey>();
  values.forEach((raw, idx) => {
    const key = HEADER_ALIASES[normalizeHeader(raw)];
    if (!key || used.has(key)) return;
    used.add(key);
    colMap.set(idx + 1, key);
  });
  let score = 0;
  if (used.has('question')) score += 5;
  if (used.has('optionA')) score += 2;
  if (used.has('optionB')) score += 2;
  if (used.has('optionC')) score += 1;
  if (used.has('optionD')) score += 1;
  if (used.has('correctAnswer')) score += 3;
  if (used.has('examCategory')) score += 1;
  return { score, colMap };
}

function rowValues(row: ExcelJS.Row, maxCol: number): string[] {
  const vals: string[] = [];
  for (let c = 1; c <= maxCol; c += 1) {
    vals.push(cellText(row.getCell(c).value));
  }
  while (vals.length && !vals[vals.length - 1]) vals.pop();
  return vals;
}

export async function parseQuestionWorkbook(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ParsedImportRow[]> {
  const workbook = new ExcelJS.Workbook();

  if (isCsvUpload(filename, mimeType)) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs accepts Buffer at runtime
    await workbook.xlsx.load(buffer as any);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const maxScanCols = Math.max(sheet.columnCount || 0, 16);
  const maxScanRows = Math.min(Math.max(sheet.rowCount || 0, 1), 30);

  let headerRowNumber = 0;
  let colMap = new Map<number, FieldKey>();
  let bestScore = 0;

  for (let r = 1; r <= maxScanRows; r += 1) {
    const values = rowValues(sheet.getRow(r), maxScanCols);
    if (!values.some(Boolean)) continue;
    const scored = scoreHeaderRow(values);
    if (scored.score > bestScore) {
      bestScore = scored.score;
      headerRowNumber = r;
      colMap = scored.colMap;
    }
    // Strong match — stop early
    if (scored.score >= 12) break;
  }

  const fields = [...colMap.values()];
  const hasQuestion = fields.includes('question');
  const hasOptions =
    fields.includes('optionA') &&
    fields.includes('optionB') &&
    fields.includes('optionC') &&
    fields.includes('optionD');
  const hasAnswer = fields.includes('correctAnswer');

  if (!headerRowNumber || bestScore < 8 || !hasQuestion || !hasOptions || !hasAnswer) {
    throw new Error('MISSING_HEADERS');
  }

  const rows: ParsedImportRow[] = [];
  const lastRow = sheet.rowCount || headerRowNumber;

  for (let rowNumber = headerRowNumber + 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const parsed = emptyParsed(rowNumber);

    for (const [col, field] of colMap) {
      parsed[field] = cellText(row.getCell(col).value);
    }

    // When exam lives in "পরীক্ষার নাম ও সাল", split trailing year.
    if (parsed.examCategory && !parsed.examYear) {
      const split = splitExamNameAndYear(parsed.examCategory);
      parsed.examCategory = split.examCategory;
      parsed.examYear = split.examYear;
    }

    if (
      !parsed.question &&
      !parsed.optionA &&
      !parsed.optionB &&
      !parsed.optionC &&
      !parsed.optionD &&
      !parsed.correctAnswer
    ) {
      continue;
    }

    rows.push(parsed);
  }

  return rows;
}

export async function buildTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('MCQ Questions');
  sheet.addRow([...TEMPLATE_HEADERS]);
  sheet.getRow(1).font = { bold: true };

  sheet.addRow([
    '১',
    '‘পরাগলী মহাভারত’ খ্যাত গ্রন্থের অনুবাদকের নাম কী?',
    '৩১তম বিসিএস',
    'সঞ্জয়',
    'কবীন্দ্র পরমেশ্বর',
    'শ্রীকর নন্দী',
    'কাশীরাম দাস',
    'খ',
  ]);
  sheet.addRow([
    '২',
    'What idea does the passage present about the value of time?',
    'বিশ্ববিদ্যালয় মঞ্জুরি কমিশন: ২০২৬',
    'Time is valuable only when used for work',
    'Time should be measured strictly by hours and days',
    'The value of time depends on how rich and meaningful moments are',
    'A long life is always a meaningful one',
    'গ',
  ]);
  sheet.addRow([
    '৩',
    'সন্ধি কাকে বলে?',
    'BCS Preliminary: 2024',
    'পরপর দুই ধ্বনির মিলন',
    'শুধু সমাস',
    'শুধু প্রত্যয়',
    'শুধু উপসর্গ',
    'ক',
  ]);

  const widths = [10, 48, 36, 28, 28, 28, 28, 10];
  sheet.columns.forEach((col, i) => {
    col.width = widths[i] ?? 18;
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildImportReportBuffer(
  rows: Array<{
    rowNumber: number;
    status: string;
    questionText: string;
    errorMessage?: string | null;
    subjectName?: string | null;
    topicName?: string | null;
    examCategory?: string | null;
  }>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import Report');
  sheet.addRow(['Row', 'Status', 'Question', 'Subject', 'Topic', 'Exam Category', 'Error']);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow([
      row.rowNumber,
      row.status,
      row.questionText,
      row.subjectName ?? '',
      row.topicName ?? '',
      row.examCategory ?? '',
      row.errorMessage ?? '',
    ]);
  }
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
