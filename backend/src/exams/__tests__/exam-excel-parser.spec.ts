import ExcelJS from 'exceljs';
import { parseExamWorkbook } from '../exam-excel-parser';

async function workbookBuffer(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Exam');
  for (const row of rows) sheet.addRow(row);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('parseExamWorkbook', () => {
  it('parses letter correct answers into option text', async () => {
    const buf = await workbookBuffer([
      ['Question', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectAnswer', 'Explanation'],
      ['Capital of BD?', 'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'A', 'Capital city'],
    ]);
    const result = await parseExamWorkbook(buf);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].correctAnswer).toBe('Dhaka');
    expect(result.rows[0].options).toEqual(['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi']);
  });

  it('reports missing columns', async () => {
    const buf = await workbookBuffer([['Question', 'OptionA'], ['Hi', 'A']]);
    const result = await parseExamWorkbook(buf);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toMatch(/Missing required columns/);
  });

  it('accepts 8-column Option 1 (ক)–4 (ঘ) headers and Bangla correct letters', async () => {
    const buf = await workbookBuffer([
      [
        'Question Number',
        'Question',
        'Option 1 (ক)',
        'Option 2 (খ)',
        'Option 3 (গ)',
        'Option 4 (ঘ)',
        'Correct Answer',
        'Explanation (Optional)',
      ],
      ['১', 'Capital of BD?', 'Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'ক', 'Capital city'],
    ]);
    const result = await parseExamWorkbook(buf);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].correctAnswer).toBe('Dhaka');
    expect(result.rows[0].explanation).toBe('Capital city');
  });
});
