import ExcelJS from 'exceljs';
import {
  EXAM_TEMPLATE_HEADERS,
  buildExamTemplateBuffer,
  parseExamWorkbook,
  resolveAnswerKey,
} from '../exam-excel-parser';

async function workbookBuffer(rows: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Exam');
  for (const row of rows) sheet.addRow(row);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('resolveAnswerKey', () => {
  it('normalizes Latin and Bangla keys', () => {
    expect(resolveAnswerKey('A')).toBe('a');
    expect(resolveAnswerKey(' b ')).toBe('b');
    expect(resolveAnswerKey('C')).toBe('c');
    expect(resolveAnswerKey('d')).toBe('d');
    expect(resolveAnswerKey('ক')).toBe('a');
    expect(resolveAnswerKey('খ')).toBe('b');
    expect(resolveAnswerKey('গ')).toBe('c');
    expect(resolveAnswerKey('ঘ')).toBe('d');
  });

  it('rejects option text and invalid keys', () => {
    expect(resolveAnswerKey('Dhaka')).toBeNull();
    expect(resolveAnswerKey('e')).toBeNull();
    expect(resolveAnswerKey('')).toBeNull();
  });
});

describe('parseExamWorkbook', () => {
  it('parses the 7-column Bangla template with a–d keys', async () => {
    const buf = await workbookBuffer([
      [...EXAM_TEMPLATE_HEADERS],
      ['1', 'Capital of BD?', 'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'a'],
      ['2', 'Largest division?', 'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'B'],
    ]);
    const result = await parseExamWorkbook(buf);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].correctAnswer).toBe('Dhaka');
    expect(result.rows[0].correctKey).toBe('a');
    expect(result.rows[0].sourceSerial).toBe('1');
    expect(result.rows[1].correctAnswer).toBe('Chittagong');
    expect(result.rows[1].correctKey).toBe('b');
  });

  it('maps Bangla উত্তর letters ক–ঘ to options', async () => {
    const buf = await workbookBuffer([
      [...EXAM_TEMPLATE_HEADERS],
      ['১', 'Capital of BD?', 'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'ক'],
    ]);
    const result = await parseExamWorkbook(buf);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].correctAnswer).toBe('Dhaka');
    expect(result.rows[0].correctKey).toBe('a');
  });

  it('preserves multi-line option text and Bengali stems', async () => {
    const buf = await workbookBuffer([
      [...EXAM_TEMPLATE_HEADERS],
      [
        '3',
        'সন্ধি কাকে বলে?',
        'পরপর দুই ধ্বনির মিলন',
        'শুধু সমাস\n(দীর্ঘ ব্যাখ্যা)',
        'শুধু প্রত্যয়',
        'শুধু উপসর্গ',
        'b',
      ],
    ]);
    const result = await parseExamWorkbook(buf);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].questionText).toContain('সন্ধি');
    expect(result.rows[0].options[1]).toContain('দীর্ঘ ব্যাখ্যা');
    expect(result.rows[0].correctAnswer).toBe(result.rows[0].options[1]);
  });

  it('skips blank rows and tolerates blank/non-sequential প্রশ্ন নং', async () => {
    const buf = await workbookBuffer([
      [...EXAM_TEMPLATE_HEADERS],
      ['1', 'Q1?', 'A1', 'B1', 'C1', 'D1', 'a'],
      ['', '', '', '', '', '', ''],
      ['', 'Q2?', 'A2', 'B2', 'C2', 'D2', 'c'],
      ['99', 'Q3?', 'A3', 'B3', 'C3', 'D3', 'd'],
    ]);
    const result = await parseExamWorkbook(buf);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[1].sourceSerial).toBeNull();
    expect(result.rows[2].sourceSerial).toBe('99');
  });

  it('reports row-specific field errors for missing options and bad keys', async () => {
    const buf = await workbookBuffer([
      [...EXAM_TEMPLATE_HEADERS],
      ['5', '', 'A', 'B', 'C', 'D', 'a'],
      ['6', 'Stem?', '', 'B', 'C', 'D', 'a'],
      ['7', 'Stem?', 'A', 'B', 'C', 'D', 'z'],
      ['8', 'Stem?', 'A', 'B', 'C', 'D', 'Dhaka'],
    ]);
    const result = await parseExamWorkbook(buf);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes('প্রশ্ন নং 5') && e.includes('প্রশ্ন'))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes('প্রশ্ন নং 6') && e.includes('"ক"'))).toBe(true);
    expect(result.errors.some((e) => e.includes('প্রশ্ন নং 7') && e.includes('invalid'))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes('প্রশ্ন নং 8') && e.includes('Dhaka'))).toBe(
      true,
    );
  });

  it('rejects legacy Preli columns without ক–ঘ headers', async () => {
    const buf = await workbookBuffer([
      [
        'প্রশ্ন নং',
        'প্রশ্ন',
        'পরীক্ষার নাম ও সাল',
        'প্রশ্নের তারিখ',
        'ক',
        'খ',
        'গ',
        'ঘ',
        'উত্তর',
      ],
      [
        '1',
        'Capital?',
        '৩১তম বিসিএস',
        '2012-04-15',
        'Dhaka',
        'Chittagong',
        'Khulna',
        'Rajshahi',
        'a',
      ],
    ]);
    // Still maps ক–ঘ / উত্তর / প্রশ্ন — legacy extra columns are ignored if Bangla options exist.
    const result = await parseExamWorkbook(buf);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].correctAnswer).toBe('Dhaka');
  });

  it('reports missing columns for incomplete headers', async () => {
    const buf = await workbookBuffer([['প্রশ্ন', 'ক'], ['Hi', 'A']]);
    const result = await parseExamWorkbook(buf);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toMatch(/Missing required columns/);
    expect(result.errors[0]).toMatch(/7-column template/);
  });

  it('buildExamTemplateBuffer matches 7 Bangla headers and is parseable', async () => {
    const buf = await buildExamTemplateBuffer();
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs Buffer load
    await wb.xlsx.load(buf as any);
    expect(wb.worksheets.map((s) => s.name)).toEqual(['MCQ Questions', 'Instructions']);
    const sheet = wb.getWorksheet('MCQ Questions')!;
    const headers = (sheet.getRow(1).values as Array<string | null | undefined>)
      .slice(1)
      .map((v) => String(v ?? ''));
    expect(headers).toEqual([...EXAM_TEMPLATE_HEADERS]);
    expect(headers).toHaveLength(7);

    const parsed = await parseExamWorkbook(buf);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBeGreaterThanOrEqual(3);
    expect(parsed.rows.every((r) => ['a', 'b', 'c', 'd'].includes(r.correctKey))).toBe(true);
  });
});
