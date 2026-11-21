import ExcelJS from 'exceljs';

/**
 * Topic Base Question Analysis Excel (DEC-042) — 8 Bangla columns:
 *   প্রশ্ন নং | প্রশ্ন | পরীক্ষার নাম ও সাল | ক | খ | গ | ঘ | উত্তর
 *
 * Lenient: blank/partial rows still import; answer keys normalized when possible.
 */
export const TOPIC_TEMPLATE_HEADERS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'পরীক্ষার নাম ও সাল',
  'ক',
  'খ',
  'গ',
  'ঘ',
  'উত্তর',
] as const;

export type TopicParsedRow = {
  rowNumber: number;
  sourceSerial: string | null;
  questionText: string;
  examLabel: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctKey: 'a' | 'b' | 'c' | 'd' | null;
  correctAnswer: string | null;
};

export type TopicParseResult = {
  rows: TopicParsedRow[];
};

const HEADER_ALIASES: Record<string, string> = {
  'প্রশ্ন নং': 'serial',
  'প্রশ্ন নম্বর': 'serial',
  'question number': 'serial',
  'question no': 'serial',
  serial: 'serial',
  প্রশ্ন: 'question',
  question: 'question',
  'পরীক্ষার নাম ও সাল': 'examLabel',
  'পরীক্ষার নাম': 'examLabel',
  examlabel: 'examLabel',
  'exam name': 'examLabel',
  ক: 'optionA',
  'option 1 (ক)': 'optionA',
  optiona: 'optionA',
  'option a': 'optionA',
  'option 1': 'optionA',
  খ: 'optionB',
  'option 2 (খ)': 'optionB',
  optionb: 'optionB',
  'option b': 'optionB',
  'option 2': 'optionB',
  গ: 'optionC',
  'option 3 (গ)': 'optionC',
  optionc: 'optionC',
  'option c': 'optionC',
  'option 3': 'optionC',
  ঘ: 'optionD',
  'option 4 (ঘ)': 'optionD',
  optiond: 'optionD',
  'option d': 'optionD',
  'option 4': 'optionD',
  উত্তর: 'correctAnswer',
  'correct answer': 'correctAnswer',
  correctanswer: 'correctAnswer',
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
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[compact] ?? null;
}

export function resolveTopicAnswerKey(raw: string): 'a' | 'b' | 'c' | 'd' | null {
  const trimmed = raw.normalize('NFC').trim().toLowerCase();
  if (!trimmed) return null;
  // Strip trailing punctuation: "ঘ." / "B)"
  const stripped = trimmed.replace(/[.)\]：:]+$/g, '').trim();
  return ANSWER_KEY_MAP[stripped] ?? ANSWER_KEY_MAP[trimmed] ?? null;
}

function pickSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  for (const sheet of workbook.worksheets) {
    const map = new Map<string, number>();
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
      const m = normalizeHeader(cellText(cell.value));
      if (m) map.set(m, col);
    });
    if (map.has('question') && (map.has('optionA') || map.has('correctAnswer'))) {
      return sheet;
    }
  }
  return workbook.worksheets[0] ?? null;
}

/** Lenient parse — never throws for bad rows; imports every non-empty row. */
export async function parseTopicWorkbook(buffer: Buffer): Promise<TopicParseResult> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer
  await workbook.xlsx.load(buffer as any);
  const sheet = pickSheet(workbook);
  if (!sheet) return { rows: [] };

  const colMap = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const mapped = normalizeHeader(cellText(cell.value));
    if (mapped) colMap.set(mapped, colNumber);
  });

  // Positional fallback when headers are missing but sheet matches 8-col Bangla layout.
  const usePositional = !colMap.has('question');
  const col = (key: string, fallback: number) =>
    usePositional ? fallback : (colMap.get(key) ?? fallback);

  const rows: TopicParsedRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const sourceSerial = cellText(row.getCell(col('serial', 1)).value) || null;
    const questionText = cellText(row.getCell(col('question', 2)).value);
    const examLabel = cellText(row.getCell(col('examLabel', 3)).value) || null;
    const optionA = cellText(row.getCell(col('optionA', 4)).value);
    const optionB = cellText(row.getCell(col('optionB', 5)).value);
    const optionC = cellText(row.getCell(col('optionC', 6)).value);
    const optionD = cellText(row.getCell(col('optionD', 7)).value);
    const correctRaw = cellText(row.getCell(col('correctAnswer', 8)).value);

    if (
      !sourceSerial &&
      !questionText &&
      !examLabel &&
      !optionA &&
      !optionB &&
      !optionC &&
      !optionD &&
      !correctRaw
    ) {
      return;
    }

    const correctKey = resolveTopicAnswerKey(correctRaw);
    const options = [optionA, optionB, optionC, optionD] as const;
    const correctAnswer =
      correctKey == null ? null : options[{ a: 0, b: 1, c: 2, d: 3 }[correctKey]];

    rows.push({
      rowNumber,
      sourceSerial,
      questionText: questionText || '(untitled)',
      examLabel,
      optionA,
      optionB,
      optionC,
      optionD,
      correctKey,
      correctAnswer: correctAnswer || null,
    });
  });

  return { rows };
}

export async function buildTopicTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Topic Questions');
  sheet.addRow([...TOPIC_TEMPLATE_HEADERS]);
  sheet.getRow(1).font = { bold: true };

  sheet.addRow([
    '১',
    'চর্যাপদের খণ্ডিত পদগুলো তিব্বতি থেকে প্রাচীন বাংলায় রূপান্তর করেন-',
    '৪৯তম বিসিএস',
    'সুনীতিকুমার চট্টোপাধ্যায়',
    'হরপ্রসাদ শাস্ত্রী',
    'রাজেন্দ্রলাল মিত্র',
    'সুকুমার সেন',
    'ঘ',
  ]);
  sheet.addRow([
    '২',
    'চর্যাপদের বর্ণনা অনুযায়ী ডোম্বীদের পেশা কি ছিল?',
    '৪৯তম বিসিএস (বাংলা)',
    'মদ চোয়ানো',
    'তাঁত বোনা',
    'চাঙ্গারি তৈরি',
    'উপরের তিনটিই',
    'ঘ',
  ]);
  sheet.addRow([
    '৩',
    '‘চর্যাচর্যবিনিশ্চয়’ এর অর্থ কি?',
    'রাবি: ০৯-১০',
    'কোনটি চর্যাগান, আর কোনটি নয়',
    'কোনটি আচরণীয়, আর কোনটি নয়',
    'কোনটি চরাচরের, আর কোনটি নয়',
    'কোনটি আচার্যের, আর কোনটি নয়',
    'খ',
  ]);

  const widths = [10, 48, 28, 28, 28, 28, 28, 10];
  sheet.columns.forEach((col, i) => {
    col.width = widths[i] ?? 18;
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
