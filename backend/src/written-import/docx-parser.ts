import { createRequire } from 'module';
import { toAsciiDigits } from '../question-import/excel-parser';
import { parseQuestionDate, toIsoDateString } from '../question-import/question-date.util';
import {
  type FieldKey,
  type ParseWrittenWorkbookResult,
  type ParsedWrittenRow,
  type WrittenExamMeta,
  emptyParsedWrittenRow,
  finalizeWrittenRow,
  scoreWrittenHeaderRow,
} from './written-row-shared';

const nodeRequire = createRequire(__filename);

type JsZipModule = {
  loadAsync: (data: Buffer) => Promise<{
    file: (name: string) => { async: (type: 'string') => Promise<string> } | null;
  }>;
};

function loadJsZip(): JsZipModule {
  const requireFromExcel = createRequire(nodeRequire.resolve('exceljs'));
  return requireFromExcel('jszip') as JsZipModule;
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number.parseInt(d, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Extract visible text from a Word paragraph or table cell fragment. */
export function extractWordText(xmlFragment: string): string {
  const withBreaks = xmlFragment
    .replace(/<w:tab\b[^/]*\/>/g, '\t')
    .replace(/<w:br\b[^/]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n');
  // `(?:\s|>)` so `<w:t` does not match `<w:tc` / `<w:tcPr>` / `<w:tbl>`.
  const parts = [...withBreaks.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) =>
    decodeXmlEntities(m[1] ?? ''),
  );
  return parts
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTables(docXml: string): string[][][] {
  return [...docXml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)].map((m) => {
    const table = m[0];
    const rowsXml = [...table.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((r) => r[0]);
    return rowsXml.map((rowXml) => {
      const cells = [...rowXml.matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((c) => c[0]);
      return cells.map((cell) => extractWordText(cell));
    });
  });
}

/** All body paragraphs in document order (including those inside tables — exam headers live there). */
export function extractAllBodyParagraphs(docXml: string): string[] {
  const body = docXml.match(/<w:body\b[\s\S]*<\/w:body>/)?.[0] ?? docXml;
  return [...body.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]
    .map((m) => extractWordText(m[0]))
    .map((t) => t.replace(/[ \t]+/g, ' ').trim())
    .filter((t) => t.length > 0);
}

/** Paragraphs outside tables (legacy labeled-block path). */
function extractNonTableParagraphs(docXml: string): string[] {
  const body = docXml.match(/<w:body\b[\s\S]*<\/w:body>/)?.[0] ?? docXml;
  const withoutTables = body.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, '\n');
  return [...withoutTables.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]
    .map((m) => extractWordText(m[0]))
    .map((t) => t.replace(/[ \t]+/g, ' ').trim())
    .filter((t) => t.length > 0);
}

const FIELD_LINE =
  /^(প্রশ্ন\s*নং|প্রশ্ন\s*নম্বর|ক্রমিক|serial|question\s*no\.?|q\.?\s*no\.?|প্রশ্ন|question|পরীক্ষার\s*নাম(?:\s*ও\s*সাল)?|exam(?:\s*name|\s*category)?|প্রশ্নের\s*তারিখ|question\s*date|date|নম্বর|মার্কস?|marks?|মডেল\s*উত্তর|আদর্শ\s*উত্তর|উত্তর|model\s*answer|answer|ব্যাখ্যা|explanation|বিষয়|বিষয়|subject|টপিক|অধ্যায়|অধ্যায়|topic|উৎস|source)\s*[:：\-–—]\s*(.*)$/i;

/** Main exam numbering: `০১।` `০১.` `1.` `01)` `১)` */
const MAIN_QUESTION_START =
  /^((?:\d{1,3}|[০-৯]{1,3}))\s*[.\u0964।)\]]\s*(.*)$/u;

/** Sub-items: `ক)` `খ।` `a)` `b.` … `ঙ)` */
const SUB_ITEM_START =
  /^([কখগঘঙচছজঝঞa-eA-E])\s*[.)\u0964।]\s*(.*)$/u;

const ANSWER_LINE =
  /^(?:উত্তর|মডেল\s*উত্তর|আদর্শ\s*উত্তর|answer|model\s*answer)\s*[:：\-–—]\s*(.*)$/i;
const EXPLANATION_LINE = /^(?:ব্যাখ্যা|explanation|note|নোট)\s*[:：\-–—]\s*(.*)$/i;

const META_HINT =
  /(?:সময়|সময়|duration|time\s*:|পরীক্ষার\s*তারিখ|exam\s*date|পূর্ণমান|total\s*marks|মোট\s*নম্বর)/i;

function mapFieldLabel(label: string): FieldKey | null {
  const n = label
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.:：]+$/g, '');
  const aliases: Record<string, FieldKey> = {
    'প্রশ্ন নং': 'serial',
    'প্রশ্ন নম্বর': 'serial',
    ক্রমিক: 'serial',
    serial: 'serial',
    'question no': 'serial',
    'question no.': 'serial',
    'q no': 'serial',
    'q. no': 'serial',
    প্রশ্ন: 'question',
    question: 'question',
    'পরীক্ষার নাম ও সাল': 'examCategory',
    'পরীক্ষার নাম': 'examCategory',
    exam: 'examCategory',
    'exam name': 'examCategory',
    'exam category': 'examCategory',
    'প্রশ্নের তারিখ': 'questionDate',
    'question date': 'questionDate',
    date: 'questionDate',
    নম্বর: 'marks',
    মার্কস: 'marks',
    মার্ক: 'marks',
    marks: 'marks',
    mark: 'marks',
    'মডেল উত্তর': 'modelAnswer',
    'আদর্শ উত্তর': 'modelAnswer',
    উত্তর: 'modelAnswer',
    'model answer': 'modelAnswer',
    answer: 'modelAnswer',
    ব্যাখ্যা: 'modelAnswer',
    explanation: 'modelAnswer',
    বিষয়: 'subject',
    বিষয়: 'subject',
    subject: 'subject',
    টপিক: 'topic',
    অধ্যায়: 'topic',
    অধ্যায়: 'topic',
    topic: 'topic',
    উৎস: 'source',
    source: 'source',
  };
  return aliases[n] ?? null;
}

function isSeparator(line: string): boolean {
  return /^[-–—*=_]{3,}$/.test(line.trim());
}

function normalizeSerial(raw: string): string {
  const digits = toAsciiDigits(raw).replace(/\D/g, '');
  if (!digits) return raw.trim().slice(0, 32);
  return String(Number.parseInt(digits, 10));
}

function extractMetaField(line: string, keys: RegExp): string {
  const parts = line.split(/[;；|]/);
  for (const part of parts) {
    const m = part.match(new RegExp(`(?:${keys.source})\\s*[:：]\\s*(.+)`, 'i'));
    if (m?.[1]) return m[1].trim();
  }
  // Whole-line form
  const whole = line.match(new RegExp(`^(?:${keys.source})\\s*[:：]\\s*(.+)$`, 'i'));
  return whole?.[1]?.trim() ?? '';
}

function normalizeExamDate(raw: string): string {
  if (!raw.trim()) return '';
  const ascii = toAsciiDigits(raw.trim())
    .replace(/[.\-]/g, '/')
    .replace(/\s+/g, '');
  // DD/MM/YYYY
  const dmy = ascii.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    const parsed = parseQuestionDate(iso);
    return parsed ? (toIsoDateString(parsed.date) ?? iso) : iso;
  }
  const parsed = parseQuestionDate(ascii);
  return parsed ? (toIsoDateString(parsed.date) ?? '') : ascii;
}

export function parseExamHeaderLines(lines: string[]): WrittenExamMeta {
  const headerLines: string[] = [];
  for (const line of lines) {
    if (MAIN_QUESTION_START.test(line)) break;
    if (FIELD_LINE.test(line) && /^(প্রশ্ন|question)\s*[:：]/i.test(line)) break;
    headerLines.push(line);
    if (headerLines.length >= 8) break;
  }

  let examTitle = '';
  let postName = '';
  let metaLine = '';
  for (const line of headerLines) {
    if (META_HINT.test(line)) {
      metaLine = line;
      continue;
    }
    if (!examTitle) {
      examTitle = line;
      continue;
    }
    if (!postName) {
      postName = line;
      continue;
    }
  }

  const duration =
    extractMetaField(metaLine, /সময়|সময়|duration|time/) ||
    extractMetaField(headerLines.join('; '), /সময়|সময়|duration|time/);
  const examDateRaw =
    extractMetaField(metaLine, /পরীক্ষার\s*তারিখ|exam\s*date|তারিখ|date/) ||
    extractMetaField(headerLines.join('; '), /পরীক্ষার\s*তারিখ|exam\s*date/);
  const totalMarks =
    extractMetaField(metaLine, /পূর্ণমান|total\s*marks|মোট\s*নম্বর|full\s*marks/) ||
    extractMetaField(headerLines.join('; '), /পূর্ণমান|total\s*marks|মোট\s*নম্বর/);

  return {
    examTitle: examTitle.slice(0, 200),
    postName: postName.slice(0, 200),
    duration: duration.slice(0, 80),
    examDate: normalizeExamDate(examDateRaw),
    totalMarks: toAsciiDigits(totalMarks).replace(/[^\d.]/g, '').slice(0, 16),
    rawHeader: headerLines.join('\n').slice(0, 2000),
  };
}

function applyExamMetaToRows(
  rows: ParsedWrittenRow[],
  meta: WrittenExamMeta,
): ParsedWrittenRow[] {
  const examCategory = [meta.examTitle, meta.postName].filter(Boolean).join(' — ').slice(0, 120);
  return rows.map((row) => {
    if (!row.examCategory && examCategory) row.examCategory = examCategory;
    if (!row.questionDate && meta.examDate) row.questionDate = meta.examDate;
    if (!row.source && meta.examTitle) row.source = meta.examTitle.slice(0, 240);
    return finalizeWrittenRow(row);
  });
}

/**
 * BD government / BCS-style exam paper: header + `০১।` prompts with `ক)–ঙ)` / `a)–e)` sub-lines.
 * Answers/explanations are optional.
 */
export function parseExamPaperParagraphs(paragraphs: string[]): ParseWrittenWorkbookResult {
  const lines = paragraphs.map((p) => p.normalize('NFC').trim()).filter(Boolean);
  if (!lines.length) return { preamble: '', rows: [] };

  const numberedCount = lines.filter((l) => MAIN_QUESTION_START.test(l)).length;
  if (numberedCount < 2) return { preamble: '', rows: [] };

  const examMeta = parseExamHeaderLines(lines);
  const rows: ParsedWrittenRow[] = [];
  let current: ParsedWrittenRow | null = null;
  let mode: 'question' | 'answer' | 'explanation' = 'question';

  const flush = () => {
    if (!current) return;
    if (current.question.trim() || current.modelAnswer.trim()) {
      rows.push(current);
    }
    current = null;
    mode = 'question';
  };

  for (const line of lines) {
    if (isSeparator(line)) continue;

    const main = line.match(MAIN_QUESTION_START);
    if (main) {
      flush();
      current = emptyParsedWrittenRow(rows.length + 1);
      current.serial = normalizeSerial(main[1]);
      current.question = (main[2] ?? '').trim();
      mode = 'question';
      continue;
    }

    // Header lines before first question
    if (!current) continue;

    const answer = line.match(ANSWER_LINE);
    if (answer) {
      mode = 'answer';
      const v = (answer[1] ?? '').trim();
      if (v) current.modelAnswer = current.modelAnswer ? `${current.modelAnswer}\n${v}` : v;
      continue;
    }
    const explanation = line.match(EXPLANATION_LINE);
    if (explanation) {
      mode = 'explanation';
      const v = (explanation[1] ?? '').trim();
      if (v) {
        const block = `[ব্যাখ্যা]\n${v}`;
        current.modelAnswer = current.modelAnswer ? `${current.modelAnswer}\n\n${block}` : block;
      }
      continue;
    }

    const sub = line.match(SUB_ITEM_START);
    if (sub && mode === 'question') {
      const letter = sub[1];
      const rest = (sub[2] ?? '').trim();
      const piece = rest ? `${letter}) ${rest}` : `${letter})`;
      current.question = current.question ? `${current.question}\n${piece}` : piece;
      continue;
    }

    if (mode === 'answer') {
      current.modelAnswer = current.modelAnswer ? `${current.modelAnswer}\n${line}` : line;
      continue;
    }
    if (mode === 'explanation') {
      current.modelAnswer = current.modelAnswer
        ? `${current.modelAnswer}\n${line}`
        : `[ব্যাখ্যা]\n${line}`;
      continue;
    }

    // Continuation of stem (or unlabeled sub-line)
    current.question = current.question ? `${current.question}\n${line}` : line;
  }
  flush();

  if (!rows.length) return { preamble: '', rows: [] };

  const withMeta = applyExamMetaToRows(rows, examMeta);
  return {
    preamble: examMeta.rawHeader,
    rows: withMeta,
    examMeta,
  };
}

function applyField(row: ParsedWrittenRow, field: FieldKey, value: string): void {
  const next = value.trim();
  if (!next) return;
  if (field === 'question' || field === 'modelAnswer') {
    row[field] = row[field] ? `${row[field]}\n${next}` : next;
    return;
  }
  if (!row[field]) row[field] = next;
}

function parseLabeledBlock(lines: string[], rowNumber: number): ParsedWrittenRow | null {
  const row = emptyParsedWrittenRow(rowNumber);
  let active: FieldKey | null = null;
  let matchedField = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || isSeparator(line)) continue;
    const fieldMatch = line.match(FIELD_LINE);
    if (fieldMatch) {
      const field = mapFieldLabel(fieldMatch[1]);
      if (field) {
        matchedField = true;
        active = field;
        applyField(row, field, fieldMatch[2] ?? '');
        continue;
      }
    }
    const numbered = line.match(MAIN_QUESTION_START);
    if (numbered && !row.question) {
      matchedField = true;
      active = 'question';
      row.serial = normalizeSerial(numbered[1]);
      applyField(row, 'question', numbered[2] ?? '');
      continue;
    }
    if (active) {
      applyField(row, active, line);
    } else if (!row.question) {
      applyField(row, 'question', line);
      active = 'question';
    }
  }

  if (!matchedField && !row.question.trim()) return null;
  if (!row.question.trim() && !row.modelAnswer.trim()) return null;
  return finalizeWrittenRow(row);
}

function parseParagraphBlocks(paragraphs: string[]): ParseWrittenWorkbookResult {
  const blocks: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.some((l) => l.trim())) blocks.push(current);
    current = [];
  };

  for (const para of paragraphs) {
    if (isSeparator(para) || (para.trim() === '' && current.length)) {
      flush();
      continue;
    }
    if (
      current.length &&
      MAIN_QUESTION_START.test(para.trim()) &&
      current.some((l) => MAIN_QUESTION_START.test(l.trim()) || FIELD_LINE.test(l.trim()))
    ) {
      flush();
    }
    current.push(para);
  }
  flush();

  const rows: ParsedWrittenRow[] = [];
  const preambleParts: string[] = [];
  for (const block of blocks) {
    const parsed = parseLabeledBlock(block, rows.length + 1);
    if (!parsed) {
      const text = block.map((l) => l.trim()).filter(Boolean).join('\n');
      if (text && rows.length === 0) preambleParts.push(text.slice(0, 500));
      continue;
    }
    if (
      rows.length === 0 &&
      !parsed.serial &&
      !parsed.modelAnswer &&
      !parsed.marks &&
      block.length <= 2 &&
      !MAIN_QUESTION_START.test(block[0]?.trim() ?? '') &&
      !FIELD_LINE.test(block[0]?.trim() ?? '')
    ) {
      preambleParts.push(parsed.question.slice(0, 500));
      continue;
    }
    rows.push(parsed);
  }
  return { preamble: preambleParts.join('\n'), rows };
}

function parseTableGrid(grid: string[][]): ParseWrittenWorkbookResult | null {
  if (!grid.length) return null;
  let headerIdx = 0;
  let best = { score: 0, colMap: new Map<number, FieldKey>() };
  for (let i = 0; i < Math.min(grid.length, 15); i += 1) {
    const scored = scoreWrittenHeaderRow(grid[i] ?? []);
    if (scored.score > best.score) {
      best = scored;
      headerIdx = i;
    }
  }
  if (best.score < 5 || !best.colMap.size) return null;

  const preamble = grid
    .slice(0, headerIdx)
    .map((r) => (r[0] ?? '').trim())
    .filter(Boolean)
    .join('\n');

  const rows: ParsedWrittenRow[] = [];
  let pendingSection = '';
  for (let i = headerIdx + 1; i < grid.length; i += 1) {
    const cells = grid[i] ?? [];
    if (!cells.some((c) => c.trim())) continue;
    const first = (cells[0] ?? '').trim();
    const mappedHasData = [...best.colMap.keys()].some((col) => (cells[col] ?? '').trim());
    if (first && !mappedHasData) {
      pendingSection = first.slice(0, 500);
      continue;
    }
    const row = emptyParsedWrittenRow(rows.length + 1);
    if (pendingSection) {
      row.sectionTitle = pendingSection;
      pendingSection = '';
    }
    best.colMap.forEach((field, col) => {
      row[field] = cells[col] ?? '';
    });
    if (!row.question.trim() && !row.modelAnswer.trim()) continue;
    rows.push(finalizeWrittenRow(row));
  }
  if (!rows.length) return null;
  return { preamble, rows };
}

/**
 * Parse a Written Question Bank `.docx`.
 * Strategy:
 * 1) Template table (প্রশ্ন / মডেল উত্তর headers)
 * 2) Real exam paper (header table + `০১।` … with `ক)–ঙ)` sub-items)
 * 3) Labeled paragraph blocks
 */
export async function parseWrittenDocx(buffer: Buffer): Promise<ParseWrittenWorkbookResult> {
  if (buffer.length >= 8 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11) {
    throw new Error('LEGACY_DOC_NOT_SUPPORTED');
  }

  const JSZip = loadJsZip();
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('INVALID_DOCX');
  }
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('INVALID_DOCX');

  const tables = extractTables(docXml);
  let bestTable: ParseWrittenWorkbookResult | null = null;
  for (const grid of tables) {
    const parsed = parseTableGrid(grid);
    if (parsed && (!bestTable || parsed.rows.length > bestTable.rows.length)) {
      bestTable = parsed;
    }
  }
  if (bestTable?.rows.length) return bestTable;

  const allParas = extractAllBodyParagraphs(docXml);
  const examPaper = parseExamPaperParagraphs(allParas);
  if (examPaper.rows.length) return examPaper;

  const fromBlocks = parseParagraphBlocks(extractNonTableParagraphs(docXml));
  if (fromBlocks.rows.length) return fromBlocks;

  throw new Error('MISSING_HEADERS');
}
