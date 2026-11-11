import { Readable } from 'stream';
import ExcelJS from 'exceljs';

export const TEMPLATE_HEADERS = [
  'Question',
  'Option A',
  'Option B',
  'Option C',
  'Option D',
  'Correct Answer',
  'Explanation',
  'Subject',
  'Topic',
  'Difficulty',
  'Exam Category',
  'Exam Year',
  'Source',
] as const;

export type ParsedImportRow = {
  rowNumber: number;
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
  return String(value).trim();
}

function normalizeHeader(h: string): string {
  return h.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

const HEADER_ALIASES: Record<string, keyof Omit<ParsedImportRow, 'rowNumber'>> = {
  question: 'question',
  'option a': 'optionA',
  'option b': 'optionB',
  'option c': 'optionC',
  'option d': 'optionD',
  'correct answer': 'correctAnswer',
  explanation: 'explanation',
  subject: 'subject',
  topic: 'topic',
  difficulty: 'difficulty',
  'exam category': 'examCategory',
  'exam year': 'examYear',
  source: 'source',
};

function isCsvUpload(filename: string, mimeType: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.csv') || mimeType.includes('csv') || mimeType === 'text/plain';
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
    // exceljs Buffer load
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs accepts Buffer at runtime
    await workbook.xlsx.load(buffer as any);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const colMap = new Map<number, keyof Omit<ParsedImportRow, 'rowNumber'>>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = HEADER_ALIASES[normalizeHeader(cellText(cell.value))];
    if (key) colMap.set(colNumber, key);
  });

  if (!colMap.size || ![...colMap.values()].includes('question')) {
    throw new Error('MISSING_HEADERS');
  }

  const rows: ParsedImportRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const parsed: ParsedImportRow = {
      rowNumber,
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
    for (const [col, field] of colMap) {
      parsed[field] = cellText(row.getCell(col).value);
    }
    if (
      !parsed.question &&
      !parsed.optionA &&
      !parsed.optionB &&
      !parsed.optionC &&
      !parsed.optionD
    ) {
      return;
    }
    rows.push(parsed);
  });

  return rows;
}

export async function buildTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Questions');
  sheet.addRow([...TEMPLATE_HEADERS]);
  sheet.getRow(1).font = { bold: true };
  sheet.addRow([
    'সন্ধি কাকে বলে?',
    'পরপর দুই ধ্বনির মিলন',
    'শুধু সমাস',
    'শুধু প্রত্যয়',
    'শুধু উপসর্গ',
    'A',
    'সন্ধি হলো পরপর দুই ধ্বনির মিলনে নতুন ধ্বনি গঠন।',
    'বাংলা',
    'ব্যাকরণ',
    'Easy',
    'BCS Preliminary',
    '',
    'Demo template row',
  ]);
  sheet.addRow([
    'Synonym of Rapid',
    'Quick',
    'Slow',
    'Lazy',
    'Dull',
    'A',
    'Rapid means happening quickly.',
    'English',
    'Vocabulary',
    'Easy',
    'Bank',
    '2025',
    'Demo template row',
  ]);
  sheet.columns.forEach((col) => {
    col.width = 22;
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
