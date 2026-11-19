import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import {
  extractWordText,
  parseExamHeaderLines,
  parseExamPaperParagraphs,
  parseWrittenDocx,
} from '../docx-parser';
import { buildWrittenDocxTemplateBuffer } from '../docx-template';
import { parseWrittenWorkbook } from '../excel-parser';

const nodeRequire = createRequire(__filename);

type JsZipCtor = new () => {
  file: (name: string, content: string | Buffer) => void;
  generateAsync: (opts: { type: 'nodebuffer' }) => Promise<Buffer>;
};

function loadJsZip(): JsZipCtor {
  const requireFromExcel = createRequire(nodeRequire.resolve('exceljs'));
  return requireFromExcel('jszip') as JsZipCtor;
}

async function minimalDocx(bodyInnerXml: string): Promise<Buffer> {
  const JSZip = loadJsZip();
  const zip = new JSZip();
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${bodyInnerXml}<w:sectPr/></w:body></w:document>`;
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file('word/document.xml', documentXml);
  return zip.generateAsync({ type: 'nodebuffer' });
}

function p(text: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</w:t></w:r></w:p>`;
}

function tableOf(...cellTexts: string[]): string {
  const rows = cellTexts
    .map(
      (t) =>
        `<w:tr><w:tc><w:tcPr><w:tcW w:w="5000" w:type="dxa"/></w:tcPr>${p(t)}</w:tc></w:tr>`,
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${rows}</w:tbl>`;
}

const JOYPURHAT =
  '/home/reaz/Downloads/2025-06-27 জেলা প্রশাসকের কার্যালয়, জয়পুরহাট.docx';

describe('written docx parser', () => {
  it('extracts unicode text runs and breaks', () => {
    const xml = `<w:p><w:r><w:t>বাংলা</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>x² ÷ more</w:t></w:r></w:p>`;
    expect(extractWordText(xml)).toContain('বাংলা');
    expect(extractWordText(xml)).toContain('x² ÷ more');
  });

  it('parses exam header metadata with Bengali date', () => {
    const meta = parseExamHeaderLines([
      'জেলা প্রশাসকের কার্যালয়, জয়পুরহাট',
      'নাজির কাম ক্যাশিয়ার/সার্টিফিকেট পেশকার',
      'সময়: ৯০ মিনিট; পরীক্ষার তারিখ: ২৭/০৬/২০২৫; পূর্ণমান: ১০০',
      '০১। প্রথম প্রশ্ন',
    ]);
    expect(meta.examTitle).toMatch(/জেলা প্রশাসক/);
    expect(meta.postName).toMatch(/নাজির/);
    expect(meta.duration).toMatch(/৯০|90/);
    expect(meta.examDate).toBe('2025-06-27');
    expect(meta.totalMarks).toBe('100');
  });

  it('groups ক)–ঙ) / a)–e) under parent questions and keeps answers optional', () => {
    const result = parseExamPaperParagraphs([
      'জেলা প্রশাসকের কার্যালয়, জয়পুরহাট',
      'নাজির কাম ক্যাশিয়ার',
      'সময়: ৯০ মিনিট; পরীক্ষার তারিখ: ২৭/০৬/২০২৫; পূর্ণমান: ১০০',
      '০১। আবেদনপত্র লিখুন।',
      '০৩। ব্যাসবাক্যসহ সমাস নির্ণয় করুন:',
      'ক) মনমাঝি',
      'খ) আলুনি',
      'গ) যথানিয়ম',
      '০৭। Make sentences with meaning:',
      'a) Get rid of',
      'b) Bring to mind',
      '১২। সরল করুন: (x² + 3x – 4)/(x² – 7x + 12) ÷ (x – 1)²',
    ]);
    expect(result.rows).toHaveLength(4);
    expect(result.examMeta?.examDate).toBe('2025-06-27');
    expect(result.rows[0].serial).toBe('1');
    expect(result.rows[1].serial).toBe('3');
    expect(result.rows[1].question).toContain('ক) মনমাঝি');
    expect(result.rows[1].question).toContain('গ) যথানিয়ম');
    expect(result.rows[2].question).toContain('a) Get rid of');
    expect(result.rows[3].question).toContain('x²');
    expect(result.rows[3].question).toContain('÷');
    expect(result.rows.every((r) => r.modelAnswer === '')).toBe(true);
    expect(result.rows.every((r) => r.questionDate === '2025-06-27')).toBe(true);
  });

  it('parses optional উত্তর / ব্যাখ্যা markers when present', () => {
    const result = parseExamPaperParagraphs([
      'Authority',
      'Post',
      'সময়: 60 মিনিট; পরীক্ষার তারিখ: 01/01/2024; পূর্ণমান: 50',
      '০১। প্রশ্ন এক',
      'উত্তর: নমুনা উত্তর',
      'ব্যাখ্যা: সংক্ষিপ্ত নোট',
      '০২। প্রশ্ন দুই',
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].modelAnswer).toContain('নমুনা উত্তর');
    expect(result.rows[0].modelAnswer).toContain('ব্যাখ্যা');
    expect(result.rows[1].modelAnswer).toBe('');
  });

  it('parses header table + numbered body like real exam papers', async () => {
    const body =
      tableOf(
        'জেলা প্রশাসকের কার্যালয়, জয়পুরহাট',
        'নাজির কাম ক্যাশিয়ার/সার্টিফিকেট পেশকার',
        'সময়: ৯০ মিনিট; পরীক্ষার তারিখ: ২৭/০৬/২০২৫; পূর্ণমান: ১০০',
      ) +
      p('০১। ধরুন আপনার নাম হাবিব।') +
      p('০২। ভাবসম্প্রসারণ করুন।') +
      p('০৩। সমাস নির্ণয় করুন:') +
      p('ক) মনমাঝি') +
      p('খ) আলুনি');
    const buf = await minimalDocx(body);
    const result = await parseWrittenDocx(buf);
    expect(result.examMeta?.examTitle).toMatch(/জেলা/);
    expect(result.examMeta?.examDate).toBe('2025-06-27');
    expect(result.rows).toHaveLength(3);
    expect(result.rows[2].question).toContain('ক) মনমাঝি');
    expect(result.rows[0].questionDate).toBe('2025-06-27');
  });

  it('parses template table from sample .docx', async () => {
    const buf = await buildWrittenDocxTemplateBuffer();
    const result = await parseWrittenDocx(buf);
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    expect(result.rows[0].question).toMatch(/সংবিধান/);
    expect(result.rows[0].marks).toBe('10');
  });

  it('parses labeled paragraph blocks', async () => {
    const body =
      p('সেট শিরোনাম') +
      p('প্রশ্ন নং: ১') +
      p('প্রশ্ন: অর্থনীতির মৌলিক সমস্যা কী?') +
      p('নম্বর: ৮') +
      p('মডেল উত্তর: কি উৎপাদন করবে।') +
      p('---') +
      p('প্রশ্ন নং: ২') +
      p('প্রশ্ন: দ্বিতীয় প্রশ্ন') +
      p('নম্বর: 5');
    const buf = await minimalDocx(body);
    const result = await parseWrittenDocx(buf);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].question).toMatch(/অর্থনীতি/);
    expect(result.rows[0].marks).toBe('8');
  });

  it('rejects OLE legacy .doc signature', async () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
    await expect(parseWrittenDocx(ole)).rejects.toThrow('LEGACY_DOC_NOT_SUPPORTED');
  });

  it('routes .docx through parseWrittenWorkbook', async () => {
    const buf = await buildWrittenDocxTemplateBuffer();
    const result = await parseWrittenWorkbook(
      buf,
      'sample.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects .doc filename early', async () => {
    await expect(
      parseWrittenWorkbook(Buffer.from('x'), 'legacy.doc', 'application/msword'),
    ).rejects.toThrow('LEGACY_DOC_NOT_SUPPORTED');
  });

  it('parses the Joypurhat reference exam .docx end-to-end', async () => {
    if (!existsSync(JOYPURHAT)) return;
    const buf = readFileSync(JOYPURHAT);
    const result = await parseWrittenDocx(buf);
    expect(result.rows).toHaveLength(32);
    expect(result.examMeta?.examTitle).toMatch(/জয়পুরহাট/);
    expect(result.examMeta?.postName).toMatch(/নাজির/);
    expect(result.examMeta?.examDate).toBe('2025-06-27');
    expect(result.examMeta?.totalMarks).toBe('100');
    expect(result.rows[0].serial).toBe('1');
    expect(result.rows[2].question).toContain('ক) মনমাঝি');
    expect(result.rows[2].question).toContain('ঙ) শশব্যস্ত');
    expect(result.rows[6].question).toContain('a) Get rid of');
    expect(result.rows[11].question).toMatch(/x²/);
    expect(result.rows[11].question).toMatch(/÷/);
    expect(result.rows[31].serial).toBe('32');
    expect(result.rows.every((r) => r.modelAnswer === '')).toBe(true);
    expect(result.rows.every((r) => Boolean(r.question.trim()))).toBe(true);
  });
});
