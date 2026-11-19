import {
  parseQuestionDate,
  toIsoDateString,
} from '../question-import/question-date.util';
import { splitExamNameAndYear, toAsciiDigits } from '../question-import/excel-parser';

export type ParsedWrittenRow = {
  rowNumber: number;
  serial: string;
  question: string;
  modelAnswer: string;
  marks: string;
  subject: string;
  topic: string;
  examCategory: string;
  examYear: string;
  questionDate: string;
  source: string;
  sectionTitle: string;
};

/** Parsed from real BD exam paper headers (authority / post / সময়; তারিখ; পূর্ণমান). */
export type WrittenExamMeta = {
  examTitle: string;
  postName: string;
  duration: string;
  examDate: string;
  totalMarks: string;
  rawHeader: string;
};

export type ParseWrittenWorkbookResult = {
  preamble: string;
  rows: ParsedWrittenRow[];
  examMeta?: WrittenExamMeta;
};

export type FieldKey = keyof Omit<ParsedWrittenRow, 'rowNumber'>;

export function normalizeWrittenHeader(h: string): string {
  return h
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[:：]+$/g, '');
}

export const WRITTEN_HEADER_ALIASES: Record<string, FieldKey> = {
  'প্রশ্ন নং': 'serial',
  'প্রশ্ন নম্বর': 'serial',
  'ক্রমিক': 'serial',
  প্রশ্ন: 'question',
  'প্রশ্নের বিবরণ': 'question',
  'পরীক্ষার নাম ও সাল': 'examCategory',
  'পরীক্ষার নাম': 'examCategory',
  'প্রশ্নের তারিখ': 'questionDate',
  তারিখ: 'questionDate',
  নম্বর: 'marks',
  'মার্কস': 'marks',
  'মার্ক': 'marks',
  'মডেল উত্তর': 'modelAnswer',
  'উত্তর': 'modelAnswer',
  'আদর্শ উত্তর': 'modelAnswer',
  বিষয়: 'subject',
  বিষয়: 'subject',
  টপিক: 'topic',
  অধ্যায়: 'topic',
  অধ্যায়: 'topic',
  উৎস: 'source',
  sl: 'serial',
  serial: 'serial',
  'question no': 'serial',
  question: 'question',
  marks: 'marks',
  mark: 'marks',
  'model answer': 'modelAnswer',
  answer: 'modelAnswer',
  modelanswer: 'modelAnswer',
  subject: 'subject',
  topic: 'topic',
  'exam category': 'examCategory',
  'exam name': 'examCategory',
  'exam year': 'examYear',
  year: 'examYear',
  'question date': 'questionDate',
  date: 'questionDate',
  source: 'source',
};

export function emptyParsedWrittenRow(rowNumber: number): ParsedWrittenRow {
  return {
    rowNumber,
    serial: '',
    question: '',
    modelAnswer: '',
    marks: '',
    subject: '',
    topic: '',
    examCategory: '',
    examYear: '',
    questionDate: '',
    source: '',
    sectionTitle: '',
  };
}

export function scoreWrittenHeaderRow(values: string[]): {
  score: number;
  colMap: Map<number, FieldKey>;
} {
  const colMap = new Map<number, FieldKey>();
  const used = new Set<FieldKey>();
  values.forEach((raw, idx) => {
    const key = WRITTEN_HEADER_ALIASES[normalizeWrittenHeader(raw)];
    if (!key || used.has(key)) return;
    used.add(key);
    colMap.set(idx, key);
  });
  let score = 0;
  if (used.has('question')) score += 5;
  if (used.has('modelAnswer')) score += 3;
  if (used.has('serial')) score += 1;
  if (used.has('marks')) score += 1;
  if (used.has('examCategory') || used.has('questionDate')) score += 1;
  return { score, colMap };
}

export function finalizeWrittenRow(row: ParsedWrittenRow): ParsedWrittenRow {
  if (row.examCategory && !row.examYear) {
    const split = splitExamNameAndYear(row.examCategory);
    row.examCategory = split.examCategory;
    row.examYear = split.examYear;
  }
  if (row.examYear) row.examYear = toAsciiDigits(row.examYear);
  if (row.marks) row.marks = toAsciiDigits(row.marks);
  if (row.questionDate) {
    const parsed = parseQuestionDate(row.questionDate);
    if (parsed) {
      row.questionDate = toIsoDateString(parsed.date) ?? row.questionDate;
      if (!row.examYear) row.examYear = parsed.examYear;
    }
  }
  return row;
}
