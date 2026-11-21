import ExcelJS from 'exceljs';

/**
 * Guest-exam Excel template (DEC-039) — fixed 7-column layout.
 *
 * Columns:
 *   প্রশ্ন নং | প্রশ্ন | ক | খ | গ | ঘ | উত্তর
 *
 * `উত্তর` must be a single letter `a`–`d` (case-insensitive) or Bangla `ক`–`ঘ`.
 * Stored `correctAnswer` is the matching option text (ক→options[0], …).
 * `প্রশ্ন নং` is for ordering/reference only; blank or non-sequential values are allowed.
 */
export const EXAM_TEMPLATE_HEADERS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'ক',
  'খ',
  'গ',
  'ঘ',
  'উত্তর',
] as const;

export type ParsedExamQuestionRow = {
  rowNumber: number;
  /** Spreadsheet serial when present; not required for import. */
  sourceSerial: string | null;
  questionText: string;
  options: [string, string, string, string];
  /** Resolved option text for the validated a–d / ক–ঘ key. */
  correctAnswer: string;
  /** Letter key normalized to lowercase a–d. */
  correctKey: 'a' | 'b' | 'c' | 'd';
  explanation: string | null;
};

export type ExamParseResult = {
  rows: ParsedExamQuestionRow[];
  errors: string[];
};

const HEADER_ALIASES: Record<string, string> = {
  // Serial (optional column; ignored for required-header checks beyond presence in template)
  'প্রশ্ন নং': 'serial',
  'প্রশ্ন নম্বর': 'serial',
  serial: 'serial',
  'question number': 'serial',
  'question no': 'serial',
  'q no': 'serial',
  // Stem
  question: 'question',
  প্রশ্ন: 'question',
  'প্রশ্নের বিবরণ': 'question',
  // Options — Bangla letters (canonical) + English aliases for the same 7-col layout
  ক: 'optionA',
  optiona: 'optionA',
  'option a': 'optionA',
  option_a: 'optionA',
  খ: 'optionB',
  optionb: 'optionB',
  'option b': 'optionB',
  option_b: 'optionB',
  গ: 'optionC',
  optionc: 'optionC',
  'option c': 'optionC',
  option_c: 'optionC',
  ঘ: 'optionD',
  optiond: 'optionD',
  'option d': 'optionD',
  option_d: 'optionD',
  // Answer key
  উত্তর: 'correctAnswer',
  সঠিকউত্তর: 'correctAnswer',
  'সঠিক উত্তর': 'correctAnswer',
  correctanswer: 'correctAnswer',
  'correct answer': 'correctAnswer',
  correct_answer: 'correctAnswer',
  answer: 'correctAnswer',
};

const ANSWER_KEY_MAP: Record<string, 'a' | 'b' | 'c' | 'd'> = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  ক: 'a',
  খ: 'b',
  গ: 'c',
  ঘ: 'd',
};

function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return '';
  let raw = '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    raw = String(value);
  } else if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    raw = value.text;
  } else if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    raw = value.richText.map((p) => p.text ?? '').join('');
  } else if (typeof value === 'object' && 'result' in value) {
    raw = value.result == null ? '' : String(value.result);
  } else {
    raw = String(value);
  }
  // Preserve Bengali / symbols; normalize line endings; trim ends only.
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function normalizeHeader(raw: string): string | null {
  const key = raw.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  const compact = key.replace(/[\s_\-()]/g, '');
  return (
    HEADER_ALIASES[key] ??
    HEADER_ALIASES[compact] ??
    HEADER_ALIASES[key.replace(/[_-]/g, '')] ??
    null
  );
}

function rowLabel(rowNumber: number, serial: string | null): string {
  if (serial) return `Row ${rowNumber} (প্রশ্ন নং ${serial})`;
  return `Row ${rowNumber}`;
}

/**
 * Normalize `উত্তর` to a–d. Accepts Latin a–d (any case) and Bangla ক–ঘ.
 * Rejects option text and any other value.
 */
export function resolveAnswerKey(raw: string): 'a' | 'b' | 'c' | 'd' | null {
  const trimmed = raw.normalize('NFC').trim().toLowerCase();
  if (!trimmed) return null;
  return ANSWER_KEY_MAP[trimmed] ?? null;
}

function mapHeaderRow(sheet: ExcelJS.Worksheet): Map<string, number> {
  const colMap = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const mapped = normalizeHeader(cellText(cell.value));
    if (mapped) colMap.set(mapped, colNumber);
  });
  return colMap;
}

function hasRequiredColumns(colMap: Map<string, number>): boolean {
  const required = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'] as const;
  return required.every((k) => colMap.has(k));
}

/** Prefer "MCQ Questions", then any sheet whose header row matches the 7-column layout. */
function pickQuestionSheet(workbook: ExcelJS.Workbook): {
  sheet: ExcelJS.Worksheet | null;
  colMap: Map<string, number>;
} {
  const named = workbook.getWorksheet('MCQ Questions');
  if (named) {
    const colMap = mapHeaderRow(named);
    if (hasRequiredColumns(colMap)) return { sheet: named, colMap };
  }
  for (const sheet of workbook.worksheets) {
    const colMap = mapHeaderRow(sheet);
    if (hasRequiredColumns(colMap)) return { sheet, colMap };
  }
  const fallback = workbook.worksheets[0] ?? null;
  return { sheet: fallback, colMap: fallback ? mapHeaderRow(fallback) : new Map() };
}

/** Parse guest-exam workbook using the 7-column template. */
export async function parseExamWorkbook(buffer: Buffer): Promise<ExamParseResult> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs accepts Buffer at runtime
  await workbook.xlsx.load(buffer as any);
  if (!workbook.worksheets.length) {
    return { rows: [], errors: ['Workbook has no sheets'] };
  }

  const { sheet, colMap } = pickQuestionSheet(workbook);
  if (!sheet) {
    return { rows: [], errors: ['Workbook has no sheets'] };
  }

  if (!hasRequiredColumns(colMap)) {
    const required = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'] as const;
    const missing = required.filter((k) => !colMap.has(k));
    return {
      rows: [],
      errors: [
        `Missing required columns: ${missing.join(', ')}. Expected 7-column template: ` +
          `${EXAM_TEMPLATE_HEADERS.join(' | ')}. ` +
          `উত্তর must be a, b, c, or d (or ক, খ, গ, ঘ).`,
      ],
    };
  }

  const rows: ParsedExamQuestionRow[] = [];
  const errors: string[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const serialCol = colMap.get('serial');
    const serialRaw = serialCol ? cellText(row.getCell(serialCol).value) : '';
    const sourceSerial = serialRaw || null;

    const questionText = cellText(row.getCell(colMap.get('question')!).value);
    const optionA = cellText(row.getCell(colMap.get('optionA')!).value);
    const optionB = cellText(row.getCell(colMap.get('optionB')!).value);
    const optionC = cellText(row.getCell(colMap.get('optionC')!).value);
    const optionD = cellText(row.getCell(colMap.get('optionD')!).value);
    const correctRaw = cellText(row.getCell(colMap.get('correctAnswer')!).value);

    // Skip blank spacer rows (all content empty, serial optional).
    if (!questionText && !optionA && !optionB && !optionC && !optionD && !correctRaw) {
      return;
    }

    const label = rowLabel(rowNumber, sourceSerial);
    const fieldErrors: string[] = [];

    if (!questionText) fieldErrors.push('Column "প্রশ্ন": question text is required');
    if (!optionA) fieldErrors.push('Column "ক": option A is required');
    if (!optionB) fieldErrors.push('Column "খ": option B is required');
    if (!optionC) fieldErrors.push('Column "গ": option C is required');
    if (!optionD) fieldErrors.push('Column "ঘ": option D is required');

    const correctKey = resolveAnswerKey(correctRaw);
    if (!correctRaw) {
      fieldErrors.push('Column "উত্তর": answer key is required (a, b, c, or d)');
    } else if (!correctKey) {
      fieldErrors.push(
        `Column "উত্তর": invalid answer key "${correctRaw}" — use a, b, c, or d (or ক, খ, গ, ঘ)`,
      );
    }

    if (fieldErrors.length) {
      for (const msg of fieldErrors) {
        errors.push(`${label}: ${msg}`);
      }
      return;
    }

    const options: [string, string, string, string] = [optionA, optionB, optionC, optionD];
    const key = correctKey!;
    const index = { a: 0, b: 1, c: 2, d: 3 }[key];

    rows.push({
      rowNumber,
      sourceSerial,
      questionText,
      options,
      correctAnswer: options[index],
      correctKey: key,
      explanation: null,
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No question rows found in the spreadsheet');
  }

  return { rows, errors };
}

/** Sample 7-column Bangla template for guest exam upload. */
export async function buildExamTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Your Academy';
  workbook.created = new Date();

  // Questions sheet first so default Excel view + simple parsers land on data.
  const sheet = workbook.addWorksheet('MCQ Questions');
  sheet.addRow([...EXAM_TEMPLATE_HEADERS]);
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: 'middle', wrapText: true };

  const samples: Array<[string, string, string, string, string, string, string]> = [
    [
      '1',
      '‘পরাগলী মহাভারত’ খ্যাত গ্রন্থের অনুবাদকের নাম কী?',
      'সঞ্জয়',
      'কবীন্দ্র পরমেশ্বর',
      'শ্রীকর নন্দী',
      'কাশীরাম দাস',
      'b',
    ],
    [
      '2',
      'What idea does the passage present about the value of time?',
      'Time is valuable only when used for work',
      'Time should be measured strictly by hours and days',
      'The value of time depends on how rich and meaningful moments are',
      'A long life is always a meaningful one',
      'c',
    ],
    [
      '3',
      'সন্ধি কাকে বলে?',
      'পরপর দুই ধ্বনির মিলন',
      'শুধু সমাস',
      'শুধু প্রত্যয়',
      'শুধু উপসর্গ',
      'a',
    ],
    [
      '4',
      'নিচের কোনটি সঠিক?',
      'বিকল্প ক',
      'বিকল্প খ\n(দীর্ঘ ব্যাখ্যাসহ)',
      'বিকল্প গ',
      'বিকল্প ঘ',
      'd',
    ],
  ];
  for (const sample of samples) {
    const row = sheet.addRow(sample);
    row.alignment = { vertical: 'top', wrapText: true };
  }

  const widths = [10, 48, 28, 28, 28, 28, 10];
  sheet.columns.forEach((col, i) => {
    col.width = widths[i] ?? 18;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Dropdown hint for উত্তর (column G) — a–d keys.
  for (let r = 2; r <= 500; r += 1) {
    sheet.getCell(`G${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"a,b,c,d"'],
      showErrorMessage: true,
      errorTitle: 'উত্তর',
      error: 'Use a, b, c, or d (Bangla ক–ঘ also accepted on upload).',
    };
  }

  const guide = workbook.addWorksheet('Instructions');
  guide.getColumn(1).width = 88;
  const guideLines = [
    'Guest exam Excel template (7 columns)',
    '',
    'Required headers (row 1 of "MCQ Questions"):',
    EXAM_TEMPLATE_HEADERS.join(' | '),
    '',
    'Rules:',
    '1. প্রশ্ন নং — optional question number (blank or non-sequential is OK).',
    '2. প্রশ্ন — required question stem (Bengali / English / multi-line OK).',
    '3. ক, খ, গ, ঘ — all four options required (multi-line OK).',
    '4. উত্তর — required single letter: a, b, c, or d (case-insensitive).',
    '   Bangla ক / খ / গ / ঘ are also accepted and map to a / b / c / d.',
    '5. Do not put the full option text in উত্তর — only the letter key.',
    '6. Blank spacer rows are skipped.',
    '7. Delete or edit the sample rows before uploading.',
    '',
    'Legacy formats (English OptionA–D, Preli exam-name/date columns) are not used for guest exams.',
  ];
  guideLines.forEach((line, i) => {
    const row = guide.getRow(i + 1);
    row.getCell(1).value = line;
    if (i === 0) row.font = { bold: true, size: 13 };
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
