import ExcelJS from 'exceljs';

export type ParsedExamQuestionRow = {
  rowNumber: number;
  questionText: string;
  options: [string, string, string, string];
  correctAnswer: string;
  explanation: string | null;
};

export type ExamParseResult = {
  rows: ParsedExamQuestionRow[];
  errors: string[];
};

const HEADER_ALIASES: Record<string, string> = {
  question: 'question',
  প্রশ্ন: 'question',
  // Platform template
  optiona: 'optionA',
  'option a': 'optionA',
  option_a: 'optionA',
  অপশনক: 'optionA',
  optionb: 'optionB',
  'option b': 'optionB',
  option_b: 'optionB',
  অপশনখ: 'optionB',
  optionc: 'optionC',
  'option c': 'optionC',
  option_c: 'optionC',
  অপশনগ: 'optionC',
  optiond: 'optionD',
  'option d': 'optionD',
  option_d: 'optionD',
  অপশনঘ: 'optionD',
  // 8-column bulk / Sheets format: Option 1 (ক) … Option 4 (ঘ)
  option1: 'optionA',
  'option 1': 'optionA',
  'option 1 (ক)': 'optionA',
  option1ক: 'optionA',
  ক: 'optionA',
  option2: 'optionB',
  'option 2': 'optionB',
  'option 2 (খ)': 'optionB',
  option2খ: 'optionB',
  খ: 'optionB',
  option3: 'optionC',
  'option 3': 'optionC',
  'option 3 (গ)': 'optionC',
  option3গ: 'optionC',
  গ: 'optionC',
  option4: 'optionD',
  'option 4': 'optionD',
  'option 4 (ঘ)': 'optionD',
  option4ঘ: 'optionD',
  ঘ: 'optionD',
  correctanswer: 'correctAnswer',
  'correct answer': 'correctAnswer',
  correct_answer: 'correctAnswer',
  answer: 'correctAnswer',
  উত্তর: 'correctAnswer',
  সঠিকউত্তর: 'correctAnswer',
  'সঠিক উত্তর': 'correctAnswer',
  explanation: 'explanation',
  'explanation (optional)': 'explanation',
  explanationoptional: 'explanation',
  ব্যাখ্যা: 'explanation',
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
    return value.richText.map((p) => p.text ?? '').join('').trim();
  }
  return String(value).trim();
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

function resolveCorrectAnswer(
  raw: string,
  options: [string, string, string, string],
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const letter = trimmed.toUpperCase();
  if (letter === 'A' || letter === 'ক') return options[0];
  if (letter === 'B' || letter === 'খ') return options[1];
  if (letter === 'C' || letter === 'গ') return options[2];
  if (letter === 'D' || letter === 'ঘ') return options[3];
  const match = options.find((o) => o.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0);
  return match ?? trimmed;
}

/** Parse guest-exam workbook (Question / OptionA–D / CorrectAnswer / Explanation). */
export async function parseExamWorkbook(buffer: Buffer): Promise<ExamParseResult> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs accepts Buffer at runtime
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], errors: ['Workbook has no sheets'] };
  }

  const headerRow = sheet.getRow(1);
  const colMap = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const mapped = normalizeHeader(cellText(cell.value));
    if (mapped) colMap.set(mapped, colNumber);
  });

  const required = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'] as const;
  const missing = required.filter((k) => !colMap.has(k));
  if (missing.length) {
    return {
      rows: [],
      errors: [
        `Missing required columns: ${missing.join(', ')}. Expected Question, OptionA–D (or Option 1 (ক)–4 (ঘ)), CorrectAnswer, Explanation (optional).`,
      ],
    };
  }

  const rows: ParsedExamQuestionRow[] = [];
  const errors: string[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const questionText = cellText(row.getCell(colMap.get('question')!).value);
    const optionA = cellText(row.getCell(colMap.get('optionA')!).value);
    const optionB = cellText(row.getCell(colMap.get('optionB')!).value);
    const optionC = cellText(row.getCell(colMap.get('optionC')!).value);
    const optionD = cellText(row.getCell(colMap.get('optionD')!).value);
    const correctRaw = cellText(row.getCell(colMap.get('correctAnswer')!).value);
    const explanationCol = colMap.get('explanation');
    const explanation = explanationCol
      ? cellText(row.getCell(explanationCol).value) || null
      : null;

    if (!questionText && !optionA && !optionB && !optionC && !optionD && !correctRaw) {
      return;
    }

    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctRaw) {
      errors.push(`Row ${rowNumber}: question and all four options plus CorrectAnswer are required`);
      return;
    }

    const options: [string, string, string, string] = [optionA, optionB, optionC, optionD];
    const correctAnswer = resolveCorrectAnswer(correctRaw, options);
    if (!correctAnswer) {
      errors.push(`Row ${rowNumber}: could not resolve CorrectAnswer`);
      return;
    }
    if (!options.includes(correctAnswer)) {
      errors.push(`Row ${rowNumber}: CorrectAnswer must match one of OptionA–D (or A/B/C/D)`);
      return;
    }

    rows.push({
      rowNumber,
      questionText,
      options,
      correctAnswer,
      explanation,
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No question rows found in the spreadsheet');
  }

  return { rows, errors };
}

export async function buildExamTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Exam');
  sheet.addRow([
    'Question',
    'OptionA',
    'OptionB',
    'OptionC',
    'OptionD',
    'CorrectAnswer',
    'Explanation',
  ]);
  sheet.addRow([
    'What is 2 + 2?',
    '3',
    '4',
    '5',
    '6',
    'B',
    'Basic arithmetic.',
  ]);
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
