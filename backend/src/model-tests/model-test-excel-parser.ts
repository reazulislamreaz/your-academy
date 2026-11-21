import ExcelJS from 'exceljs';

/**
 * Model Test Excel — 7-column layout with optional preamble rows.
 *
 * Columns (header row may start after title/date banner rows):
 *   প্রশ্ন নং | প্রশ্ন | ক | খ | গ | ঘ | উত্তর
 *
 * `উত্তর` must be a single letter `a`–`d` (case-insensitive) or Bangla `ক`–`ঘ`.
 * Stored `correctAnswer` is the matching option text.
 */
export const MODEL_TEST_TEMPLATE_HEADERS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'ক',
  'খ',
  'গ',
  'ঘ',
  'উত্তর',
] as const;

export type ParsedModelTestQuestionRow = {
  rowNumber: number;
  sourceSerial: string | null;
  questionText: string;
  options: [string, string, string, string];
  correctAnswer: string;
  correctKey: 'a' | 'b' | 'c' | 'd';
  explanation: string | null;
};

export type ModelTestParseResult = {
  rows: ParsedModelTestQuestionRow[];
  errors: string[];
  /** Title text from rows above the header (when present). */
  suggestedTitle: string | null;
  /** Metadata / date line from preamble (when present). */
  suggestedDescription: string | null;
  /** Year parsed from preamble or filename-like digits when found. */
  suggestedYear: number | null;
  headerRowNumber: number;
};

const HEADER_ALIASES: Record<string, string> = {
  'প্রশ্ন নং': 'serial',
  'প্রশ্ন নম্বর': 'serial',
  serial: 'serial',
  'question number': 'serial',
  'question no': 'serial',
  'q no': 'serial',
  question: 'question',
  প্রশ্ন: 'question',
  'প্রশ্নের বিবরণ': 'question',
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

export function resolveModelTestAnswerKey(raw: string): 'a' | 'b' | 'c' | 'd' | null {
  const trimmed = raw.normalize('NFC').trim().toLowerCase();
  if (!trimmed) return null;
  return ANSWER_KEY_MAP[trimmed] ?? null;
}

function mapHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number): Map<string, number> {
  const colMap = new Map<string, number>();
  sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const mapped = normalizeHeader(cellText(cell.value));
    if (mapped) colMap.set(mapped, colNumber);
  });
  return colMap;
}

function hasRequiredColumns(colMap: Map<string, number>): boolean {
  const required = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'] as const;
  return required.every((k) => colMap.has(k));
}

/** Looks like the Bangla/English 7-col header (needs stem + at least one option letter + answer). */
function looksLikeHeaderRow(colMap: Map<string, number>): boolean {
  return colMap.has('question') && colMap.has('serial') && hasRequiredColumns(colMap);
}

/**
 * Scan the first N rows for a header containing `প্রশ্ন নং` + `প্রশ্ন` (+ options + উত্তর).
 * Falls back to first row with all required mapped columns.
 */
function locateHeader(
  sheet: ExcelJS.Worksheet,
  maxScan = 30,
): { headerRowNumber: number; colMap: Map<string, number> } | null {
  const rowCount = Math.min(sheet.rowCount || maxScan, maxScan);
  let fallback: { headerRowNumber: number; colMap: Map<string, number> } | null = null;

  for (let r = 1; r <= rowCount; r += 1) {
    const colMap = mapHeaderRow(sheet, r);
    if (looksLikeHeaderRow(colMap)) {
      return { headerRowNumber: r, colMap };
    }
    if (!fallback && hasRequiredColumns(colMap)) {
      fallback = { headerRowNumber: r, colMap };
    }
  }
  return fallback;
}

function uniquePreambleTexts(sheet: ExcelJS.Worksheet, headerRowNumber: number): string[] {
  const texts: string[] = [];
  const seen = new Set<string>();
  for (let r = 1; r < headerRowNumber; r += 1) {
    const row = sheet.getRow(r);
    let first = '';
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (colNumber === 1 || !first) {
        const t = cellText(cell.value);
        if (t) first = t;
      }
    });
    if (!first) continue;
    const key = first.normalize('NFC');
    if (seen.has(key)) continue;
    seen.add(key);
    texts.push(key);
  }
  return texts;
}

/** Extract a 4-digit Gregorian year from Bangla/Latin digit strings. */
function extractYear(text: string): number | null {
  const latin = text
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .normalize('NFC');
  const match = latin.match(/(?:19|20)\d{2}/);
  if (!match) return null;
  const year = Number(match[0]);
  if (year < 1900 || year > 2100) return null;
  return year;
}

function pickQuestionSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  const named = workbook.getWorksheet('MCQ Questions');
  if (named && locateHeader(named)) return named;
  for (const sheet of workbook.worksheets) {
    if (locateHeader(sheet)) return sheet;
  }
  return workbook.worksheets[0] ?? null;
}

/** Parse Model Test workbook; locates header even when title/date rows precede it. */
export async function parseModelTestWorkbook(buffer: Buffer): Promise<ModelTestParseResult> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs accepts Buffer at runtime
  await workbook.xlsx.load(buffer as any);
  if (!workbook.worksheets.length) {
    return {
      rows: [],
      errors: ['Workbook has no sheets'],
      suggestedTitle: null,
      suggestedDescription: null,
      suggestedYear: null,
      headerRowNumber: 0,
    };
  }

  const sheet = pickQuestionSheet(workbook);
  if (!sheet) {
    return {
      rows: [],
      errors: ['Workbook has no sheets'],
      suggestedTitle: null,
      suggestedDescription: null,
      suggestedYear: null,
      headerRowNumber: 0,
    };
  }

  const located = locateHeader(sheet);
  if (!located) {
    return {
      rows: [],
      errors: [
        `Could not find header row with columns: ${MODEL_TEST_TEMPLATE_HEADERS.join(' | ')}. ` +
          `Title/date banner rows above the header are OK — include a row with প্রশ্ন নং and প্রশ্ন.`,
      ],
      suggestedTitle: null,
      suggestedDescription: null,
      suggestedYear: null,
      headerRowNumber: 0,
    };
  }

  const { headerRowNumber, colMap } = located;
  const preamble = uniquePreambleTexts(sheet, headerRowNumber);
  const suggestedTitle = preamble[0]?.slice(0, 200) || null;
  const suggestedDescription = preamble.slice(1).join('\n').slice(0, 2000) || null;
  let suggestedYear: number | null = null;
  for (const line of preamble) {
    suggestedYear = extractYear(line);
    if (suggestedYear) break;
  }

  const rows: ParsedModelTestQuestionRow[] = [];
  const errors: string[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;

    const serialCol = colMap.get('serial');
    const serialRaw = serialCol ? cellText(row.getCell(serialCol).value) : '';
    const sourceSerial = serialRaw || null;

    const questionText = cellText(row.getCell(colMap.get('question')!).value);
    const optionA = cellText(row.getCell(colMap.get('optionA')!).value);
    const optionB = cellText(row.getCell(colMap.get('optionB')!).value);
    const optionC = cellText(row.getCell(colMap.get('optionC')!).value);
    const optionD = cellText(row.getCell(colMap.get('optionD')!).value);
    const correctRaw = cellText(row.getCell(colMap.get('correctAnswer')!).value);

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

    const correctKey = resolveModelTestAnswerKey(correctRaw);
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

  return {
    rows,
    errors,
    suggestedTitle,
    suggestedDescription,
    suggestedYear,
    headerRowNumber,
  };
}

/** Sample template with optional preamble rows (mirrors real Model Test sheets). */
export async function buildModelTestTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Your Academy';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('MCQ Questions');
  sheet.addRow(['ডাক অধিদপ্তরের উপজেলা পোস্ট মাস্টার ২০১০']);
  sheet.addRow(['পরীক্ষার তারিখ ০১.০১.২০১০ সময় ১ ঘণ্টা; পূর্ণমান ১০০']);
  sheet.addRow([...MODEL_TEST_TEMPLATE_HEADERS]);
  const header = sheet.getRow(3);
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
      'বাংলা লিপির উৎপত্তি কোন লিপি থেকে?',
      'খরোষ্ঠী লিপি',
      'ব্রাহ্মী লিপি',
      'অশোক লিপি',
      'প্রকৃত লিপি [e) কোনোটিই নয়]',
      'b',
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
  sheet.views = [{ state: 'frozen', ySplit: 3 }];

  for (let r = 4; r <= 500; r += 1) {
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
    'Model Test Excel template (7 columns)',
    '',
    'Optional: rows 1–2 may contain title and date/marks metadata.',
    'Header row must include:',
    MODEL_TEST_TEMPLATE_HEADERS.join(' | '),
    '',
    'Rules:',
    '1. প্রশ্ন নং — optional question number.',
    '2. প্রশ্ন — required question stem.',
    '3. ক, খ, গ, ঘ — all four options required.',
    '4. উত্তর — a, b, c, or d (or ক–ঘ).',
    '5. Blank spacer rows are skipped.',
  ];
  guideLines.forEach((line, i) => {
    const row = guide.getRow(i + 1);
    row.getCell(1).value = line;
    if (i === 0) row.font = { bold: true, size: 13 };
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
