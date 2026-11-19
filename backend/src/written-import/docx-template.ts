import { createRequire } from 'module';
import { WRITTEN_TEMPLATE_HEADERS } from './excel-parser';

const nodeRequire = createRequire(__filename);

type JsZipInstance = {
  file: (name: string, content: string) => void;
  generateAsync: (opts: { type: 'nodebuffer' }) => Promise<Buffer>;
};

type JsZipCtor = new () => JsZipInstance;

function loadJsZipCtor(): JsZipCtor {
  const requireFromExcel = createRequire(nodeRequire.resolve('exceljs'));
  return requireFromExcel('jszip') as JsZipCtor;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraph(text: string, bold = false): string {
  const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function tableCell(text: string, bold = false): string {
  return `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${paragraph(text, bold)}</w:tc>`;
}

function tableRow(cells: string[], bold = false): string {
  return `<w:tr>${cells.map((c) => tableCell(c, bold)).join('')}</w:tr>`;
}

/**
 * Minimal OOXML `.docx` sample for Written Question Bank uploads.
 * Includes a header table (recommended) plus a labeled-block example in the guide section.
 */
export async function buildWrittenDocxTemplateBuffer(): Promise<Buffer> {
  const JSZip = loadJsZipCtor();
  const zip = new JSZip();

  const sampleRow = [
    '1',
    'বাংলাদেশের সংবিধান কবে গৃহীত হয়? বিস্তারিত লিখুন।',
    'BCS Written 2024',
    '2024-06-15',
    '10',
    'বাংলাদেশের সংবিধান ৪ নভেম্বর ১৯৭২ সালে গৃহীত হয়।',
  ];

  const table =
    `<w:tbl>` +
    `<w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>` +
    tableRow([...WRITTEN_TEMPLATE_HEADERS], true) +
    tableRow(sampleRow) +
    `</w:tbl>`;

  const guide = [
    paragraph('Your Academy — Written Question Bank (.docx) guide', true),
    paragraph(
      'Preferred: put questions in a Word TABLE with the same headers as the Excel template (প্রশ্ন নং, প্রশ্ন, পরীক্ষার নাম ও সাল, প্রশ্নের তারিখ, নম্বর, মডেল উত্তর). Model answer may be blank (imports as draft).',
    ),
    paragraph(
      'Alternative: labeled blocks separated by a blank line or --- . Example below is illustrative only — delete before upload if you only want the table.',
    ),
    paragraph('---'),
    paragraph('প্রশ্ন নং: 2'),
    paragraph('প্রশ্ন: অর্থনীতির মৌলিক সমস্যাগুলো কী কী?'),
    paragraph('নম্বর: 8'),
    paragraph('মডেল উত্তর: কি উৎপাদন করবে, কিভাবে উৎপাদন করবে, কার জন্য উৎপাদন করবে।'),
    paragraph('---'),
    paragraph(
      'Legacy .doc (Word 97–2003) is not supported. In Word/Google Docs: File → Save As / Download → .docx.',
    ),
  ].join('');

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${paragraph('Written Question Bank sample', true)}${table}${guide}<w:sectPr/></w:body>` +
    `</w:document>`;

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`,
  );
  zip.file('word/document.xml', documentXml);
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );

  return zip.generateAsync({ type: 'nodebuffer' });
}
