import ExcelJS from 'exceljs';
import { parseQuestionWorkbook } from '../excel-parser';

async function workbookBuffer(
  rows: Array<Array<string | number>>,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('MCQ');
  for (const row of rows) sheet.addRow(row);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('parseQuestionWorkbook', () => {
  it('captures first-column preamble above the header', async () => {
    const buf = await workbookBuffer([
      ['বাংলাদেশ ব্যাংক নিয়োগ পরীক্ষা ২০২৬'],
      ['প্রিলিমিনারি'],
      ['প্রশ্ন নং', 'প্রশ্ন', 'পরীক্ষার নাম ও সাল', 'ক', 'খ', 'গ', 'ঘ', 'উত্তর'],
      ['১', 'Sample Q?', 'BB: 2026', 'A1', 'B1', 'C1', 'D1', 'ক'],
    ]);

    const result = await parseQuestionWorkbook(buf, 'sample.xlsx', '');
    expect(result.preamble).toContain('বাংলাদেশ ব্যাংক');
    expect(result.preamble).toContain('প্রিলিমিনারি');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].serial).toBe('১');
    expect(result.rows[0].examYear).toBe('2026');
  });

  it('propagates mid-sheet section headers onto following MCQs', async () => {
    const buf = await workbookBuffer([
      ['প্রশ্ন নং', 'প্রশ্ন', 'পরীক্ষার নাম ও সাল', 'ক', 'খ', 'গ', 'ঘ', 'উত্তর'],
      ['অনুবাদ সাহিত্য'],
      ['১', 'Q1?', '৩১তম বিসিএস', 'a', 'b', 'c', 'd', 'খ'],
      ['২', 'Q2?', '৩১তম বিসিএস', 'a', 'b', 'c', 'd', 'ক'],
      ['ইংরেজি'],
      ['৩', 'Q3?', 'BCS: 2024', 'a', 'b', 'c', 'd', 'গ'],
    ]);

    const result = await parseQuestionWorkbook(buf, 'sections.xlsx', '');
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].sectionTitle).toBe('অনুবাদ সাহিত্য');
    expect(result.rows[1].sectionTitle).toBe('অনুবাদ সাহিত্য');
    expect(result.rows[2].sectionTitle).toBe('ইংরেজি');
    expect(result.rows[2].examYear).toBe('2024');
  });
});
