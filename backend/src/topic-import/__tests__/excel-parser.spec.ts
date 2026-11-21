import ExcelJS from 'exceljs';
import {
  TOPIC_TEMPLATE_HEADERS,
  buildTopicTemplateBuffer,
  parseTopicWorkbook,
  resolveTopicAnswerKey,
} from '../excel-parser';

async function workbookBuffer(rows: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Topics');
  for (const row of rows) sheet.addRow(row);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('topic excel parser', () => {
  it('normalizes answer keys', () => {
    expect(resolveTopicAnswerKey('ঘ')).toBe('d');
    expect(resolveTopicAnswerKey('B')).toBe('b');
    expect(resolveTopicAnswerKey('a')).toBe('a');
    expect(resolveTopicAnswerKey('')).toBeNull();
    expect(resolveTopicAnswerKey('maybe')).toBeNull();
  });

  it('parses 8-column Bangla template leniently', async () => {
    const buf = await workbookBuffer([
      [...TOPIC_TEMPLATE_HEADERS],
      ['১', 'Q1?', '৪৯তম বিসিএস', 'A1', 'B1', 'C1', 'D1', 'ঘ'],
      ['২', '', 'রাবি: ০৯-১০', '', '', '', '', ''], // still imported
      ['', '', '', '', '', '', '', ''], // blank spacer skipped
    ]);
    const result = await parseTopicWorkbook(buf);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].correctKey).toBe('d');
    expect(result.rows[0].correctAnswer).toBe('D1');
    expect(result.rows[0].examLabel).toContain('বিসিএস');
    expect(result.rows[1].questionText).toBe('(untitled)');
  });

  it('buildTopicTemplateBuffer is parseable', async () => {
    const buf = await buildTopicTemplateBuffer();
    const parsed = await parseTopicWorkbook(buf);
    expect(parsed.rows.length).toBeGreaterThanOrEqual(3);
  });
});
