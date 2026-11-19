import ExcelJS from 'exceljs';
import { createHash } from 'crypto';
import { parseWrittenDocx } from './docx-parser';
import {
  type FieldKey,
  type ParseWrittenWorkbookResult,
  type ParsedWrittenRow,
  emptyParsedWrittenRow,
  finalizeWrittenRow,
  scoreWrittenHeaderRow,
} from './written-row-shared';
import { toIsoDateString } from '../question-import/question-date.util';
import { toAsciiDigits } from '../question-import/excel-parser';

/**
 * Written Question Bank Excel template (DEC-040).
 * Columns: প্রশ্ন নং | প্রশ্ন | পরীক্ষার নাম ও সাল | প্রশ্নের তারিখ | নম্বর | মডেল উত্তর
 */
export const WRITTEN_TEMPLATE_HEADERS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'পরীক্ষার নাম ও সাল',
  'প্রশ্নের তারিখ',
  'নম্বর',
  'মডেল উত্তর',
] as const;

export type { ParsedWrittenRow, ParseWrittenWorkbookResult };

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDateString(value) ?? '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim();
  }
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((p) => (p as { text: string }).text).join('').trim();
  }
  if (typeof value === 'object' && 'result' in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function isCsvUpload(filename: string, mimeType: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.csv') || mimeType.includes('csv') || mimeType === 'text/plain';
}

export function parseMarks(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(toAsciiDigits(raw.trim()).replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0 || n > 9999) return null;
  return Math.round(n * 100) / 100;
}

export function hashWrittenIdentity(question: string, modelAnswer: string): string {
  const payload = ['written:v1', question.normalize('NFC').trim(), modelAnswer.normalize('NFC').trim()].join(
    '\n',
  );
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export async function buildWrittenTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Written Questions');
  sheet.addRow([...WRITTEN_TEMPLATE_HEADERS]);
  sheet.addRow([
    '1',
    'বাংলাদেশের সংবিধান কবে গৃহীত হয়? বিস্তারিত লিখুন।',
    'BCS Written 2024',
    '2024-06-15',
    '10',
    'বাংলাদেশের সংবিধান ৪ নভেম্বর ১৯৭২ সালে গৃহীত হয়…',
  ]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 28;
  });
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildWrittenImportReportBuffer(
  rows: Array<{
    rowNumber: number;
    status: string;
    questionText: string;
    errorMessage: string | null;
    subjectName: string | null;
    topicName: string | null;
    examCategory: string | null;
  }>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');
  sheet.addRow(['Row', 'Status', 'Question', 'Subject', 'Topic', 'Exam', 'Error']);
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

async function parseCsv(buffer: Buffer): Promise<ParseWrittenWorkbookResult> {
  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { preamble: '', rows: [] };
  const split = (line: string) =>
    line.split(',').map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  let headerIdx = 0;
  let best = { score: 0, colMap: new Map<number, FieldKey>() };
  for (let i = 0; i < Math.min(lines.length, 30); i += 1) {
    const scored = scoreWrittenHeaderRow(split(lines[i]));
    if (scored.score > best.score) {
      best = scored;
      headerIdx = i;
    }
  }
  if (best.score < 5 || !best.colMap.size) throw new Error('MISSING_HEADERS');
  const preamble = lines
    .slice(0, headerIdx)
    .map((l) => split(l)[0] ?? '')
    .filter(Boolean)
    .join('\n');
  const rows: ParsedWrittenRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i += 1) {
    const cells = split(lines[i]);
    if (!cells.some((c) => c)) continue;
    const first = cells[0] ?? '';
    const restEmpty = cells.slice(1).every((c) => !c);
    if (restEmpty && first && !best.colMap.has(0)) {
      (parseCsv as { _section?: string })._section = first.slice(0, 500);
      continue;
    }
    const row = emptyParsedWrittenRow(rows.length + 1);
    const pending = (parseCsv as { _section?: string })._section;
    if (pending) {
      row.sectionTitle = pending;
      (parseCsv as { _section?: string })._section = undefined;
    }
    best.colMap.forEach((field, col) => {
      row[field] = cells[col] ?? '';
    });
    if (!row.question.trim() && !row.modelAnswer.trim()) continue;
    rows.push(finalizeWrittenRow(row));
  }
  return { preamble, rows };
}

async function parseXlsx(buffer: Buffer): Promise<ParseWrittenWorkbookResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { preamble: '', rows: [] };

  let headerRow = 1;
  let best = { score: 0, colMap: new Map<number, FieldKey>() };
  const maxScan = Math.min(sheet.rowCount || 1, 40);
  for (let r = 1; r <= maxScan; r += 1) {
    const values: string[] = [];
    sheet.getRow(r).eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cellText(cell.value);
    });
    const scored = scoreWrittenHeaderRow(values);
    if (scored.score > best.score) {
      best = scored;
      headerRow = r;
    }
  }
  if (best.score < 5 || !best.colMap.size) throw new Error('MISSING_HEADERS');

  const preambleParts: string[] = [];
  for (let r = 1; r < headerRow; r += 1) {
    const first = cellText(sheet.getRow(r).getCell(1).value);
    if (first) preambleParts.push(first);
  }

  const rows: ParsedWrittenRow[] = [];
  let pendingSection = '';
  for (let r = headerRow + 1; r <= sheet.rowCount; r += 1) {
    const excelRow = sheet.getRow(r);
    const values: string[] = [];
    excelRow.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cellText(cell.value);
    });
    if (!values.some((v) => v)) continue;

    const first = values[0] ?? '';
    const mappedHasData = [...best.colMap.keys()].some((col) => (values[col] ?? '').trim());
    if (first && !mappedHasData) {
      pendingSection = first.slice(0, 500);
      continue;
    }
    const questionCol = [...best.colMap.entries()].find(([, f]) => f === 'question')?.[0];
    if (
      first &&
      questionCol != null &&
      questionCol !== 0 &&
      !(values[questionCol] ?? '').trim() &&
      values.every((v, idx) => idx === 0 || !v.trim())
    ) {
      pendingSection = first.slice(0, 500);
      continue;
    }

    const row = emptyParsedWrittenRow(rows.length + 1);
    if (pendingSection) {
      row.sectionTitle = pendingSection;
      pendingSection = '';
    }
    best.colMap.forEach((field, col) => {
      row[field] = values[col] ?? '';
    });
    if (!row.question.trim() && !row.modelAnswer.trim()) continue;
    rows.push(finalizeWrittenRow(row));
  }
  return { preamble: preambleParts.join('\n'), rows };
}

export async function parseWrittenWorkbook(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ParseWrittenWorkbookResult> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
    throw new Error('LEGACY_DOC_NOT_SUPPORTED');
  }
  if (
    lower.endsWith('.docx') ||
    mimeType.includes('wordprocessingml') ||
    mimeType === 'application/msword'
  ) {
    return parseWrittenDocx(buffer);
  }
  if (isCsvUpload(filename, mimeType)) {
    return parseCsv(buffer);
  }
  return parseXlsx(buffer);
}
