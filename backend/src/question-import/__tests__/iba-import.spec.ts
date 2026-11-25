import ExcelJS from 'exceljs';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import {
  buildTemplateBuffer,
  normalizeCorrectAnswer,
  parseQuestionWorkbook,
  TEMPLATE_HEADERS,
} from '../excel-parser';
import { QuestionImportService } from '../question-import.service';

/** IBA (5-option) Preli upload — additive to the existing 4-option flow. */

const BOM = '﻿';
const csv = (lines: string[], bom = false) =>
  Buffer.from((bom ? BOM : '') + lines.join('\r\n') + '\r\n\r\n', 'utf8');

const FOUR_HEADER = 'প্রশ্ন নং,প্রশ্ন,প্রশ্নের তারিখ,ক,খ,গ,ঘ,উত্তর';
const FIVE_HEADER = 'প্রশ্ন নং,প্রশ্ন,প্রশ্নের তারিখ,ক,খ,গ,ঘ,ঙ,উত্তর';

describe('IBA parser support', () => {
  it('normalizeCorrectAnswer: E only when allowE; trims and uppercases', () => {
    expect(normalizeCorrectAnswer(' b')).toBe('B');
    expect(normalizeCorrectAnswer('e')).toBeNull(); // 4-option flow unchanged
    expect(normalizeCorrectAnswer('ঙ')).toBeNull();
    expect(normalizeCorrectAnswer('e', { allowE: true })).toBe('E');
    expect(normalizeCorrectAnswer(' ঙ ', { allowE: true })).toBe('E');
    expect(normalizeCorrectAnswer('5', { allowE: true })).toBe('E');
    expect(normalizeCorrectAnswer('Option E', { allowE: true })).toBe('E');
    expect(normalizeCorrectAnswer('F', { allowE: true })).toBeNull();
  });

  it('(e) CSV with UTF-8 BOM + Bangla: first header still matches, text intact, blank lines skipped', async () => {
    const buf = csv(
      [
        FIVE_HEADER,
        '১,বাংলাদেশের রাজধানী কোথায়?,2024-01-10,ঢাকা,খুলনা,রাজশাহী,সিলেট,বরিশাল,ক',
        ',,,,,,,,',
      ],
      true,
    );
    const { rows } = await parseQuestionWorkbook(buf, 'iba.csv', 'text/csv');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      serial: '১',
      question: 'বাংলাদেশের রাজধানী কোথায়?',
      optionA: 'ঢাকা',
      optionE: 'বরিশাল',
      correctAnswer: 'ক',
    });
  });

  it('snake_case headers (option_a … option_e, correct_answer) are read by name, any order', async () => {
    const buf = csv([
      'correct_answer,question,option_e,option_d,option_c,option_b,option_a,date',
      ' e,Pick five,E5,D4,C3,B2,A1,2024-01-10',
    ]);
    const { rows } = await parseQuestionWorkbook(buf, 'snake.csv', 'text/csv');
    expect(rows[0]).toMatchObject({
      question: 'Pick five',
      optionA: 'A1',
      optionD: 'D4',
      optionE: 'E5',
      correctAnswer: 'e',
    });
  });

  it('4-option template is unchanged; IBA template adds ঙ after ঘ with example rows', async () => {
    const read = async (buf: Buffer) => {
      const wb = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs accepts Buffer
      await wb.xlsx.load(buf as any);
      const sheet = wb.worksheets[0]!;
      return { header: (sheet.getRow(1).values as unknown[]).slice(1), rows: sheet.rowCount };
    };
    const four = await read(await buildTemplateBuffer());
    expect(four.header).toEqual([...TEMPLATE_HEADERS]);
    const five = await read(await buildTemplateBuffer({ iba: true }));
    expect(five.header).toEqual([
      'প্রশ্ন নং',
      'প্রশ্ন',
      'পরীক্ষার নাম ও সাল',
      'প্রশ্নের তারিখ',
      'ক',
      'খ',
      'গ',
      'ঘ',
      'ঙ',
      'উত্তর',
    ]);
    expect(five.rows).toBe(3);
    // The IBA template parses back cleanly as an IBA sheet.
    const { rows } = await parseQuestionWorkbook(
      await buildTemplateBuffer({ iba: true }),
      't.xlsx',
      '',
    );
    expect(rows.map((r) => r.optionE)).toEqual(['Ordinary', '৩৫০']);
  });
});

describe('IBA upload + import (QuestionImportService)', () => {
  const user = { userId: 'admin-1', role: 'ADMIN' as const, sessionId: 's1' };
  let importDir: string;
  const oldImportDir = process.env.QUESTION_IMPORT_DIR;

  beforeEach(() => {
    importDir = mkdtempSync(path.join(tmpdir(), 'iba-import-'));
    process.env.QUESTION_IMPORT_DIR = importDir;
  });
  afterEach(() => {
    rmSync(importDir, { recursive: true, force: true });
    if (oldImportDir === undefined) delete process.env.QUESTION_IMPORT_DIR;
    else process.env.QUESTION_IMPORT_DIR = oldImportDir;
  });

  function setup() {
    const tx = {
      $executeRaw: jest.fn(),
      category: { create: jest.fn() },
      question: { create: jest.fn().mockResolvedValue({ id: 'q-new' }) },
      questionImportRow: { createMany: jest.fn(), update: jest.fn() },
      questionUploadBatch: { create: jest.fn() },
    };
    const prisma = {
      category: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'cat-1', slug: 'iba', name: 'IBA', children: [] }]),
      },
      question: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      questionImportRow: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      questionUploadBatch: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(async (args: { where: { batchCode?: string; id?: string } }) =>
          args.where.batchCode ? null : { id: args.where.id, status: 'VALIDATED', placements: [] },
        ),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    };
    const service = new QuestionImportService(prisma as never);
    const file = (buffer: Buffer) =>
      ({
        buffer,
        originalname: 'upload.csv',
        size: buffer.length,
        mimetype: 'text/csv',
      }) as Express.Multer.File;
    const rowsOf = () =>
      (
        tx.questionImportRow.createMany.mock.calls[0]![0] as {
          data: Array<Record<string, unknown>>;
        }
      ).data;
    return { service, prisma, tx, file, rowsOf };
  }

  it('(a) 4-option CSV, IBA OFF: same rows as before, batch not IBA, option_e null', async () => {
    const { service, tx, file, rowsOf } = setup();
    await service.upload(
      user,
      file(csv([FOUR_HEADER, '1,Q1,2024-01-10,a,b,c,d,খ', '2,Q2,2024-01-10,a,b,c,d,'])),
      {
        subjectHint: 'IBA',
      },
    );
    expect(tx.questionUploadBatch.create.mock.calls[0]![0].data.isIba).toBe(false);
    expect(rowsOf().map((r) => [r.status, r.correctAnswer, r.optionE])).toEqual([
      ['VALID', 'B', null],
      ['VALID', null, null], // blank answer still allowed (DRAFT) in the 4-option flow
    ]);
  });

  it('(c) option_e column present but IBA OFF: ignored silently; answer E still invalid as before', async () => {
    const { service, file, rowsOf } = setup();
    await service.upload(
      user,
      file(csv([FIVE_HEADER, '1,Q1,2024-01-10,a,b,c,d,e,ক', '2,Q2,2024-01-10,a,b,c,d,e,ঙ'])),
      { subjectHint: 'IBA' },
    );
    const rows = rowsOf();
    expect(rows[0]).toMatchObject({ status: 'VALID', correctAnswer: 'A', optionE: null });
    expect(rows[1]).toMatchObject({ status: 'INVALID', optionE: null });
    expect(rows[1]!.errorMessage).toMatch(/must be ক\/খ\/গ\/ঘ/);
  });

  it('(b)+(d) IBA ON: valid rows kept, invalid rows listed with clear reasons', async () => {
    const { service, tx, file, rowsOf } = setup();
    await service.upload(
      user,
      file(
        csv([
          FIVE_HEADER,
          '1,Q1,2024-01-10,a,b,c,d,e, e',
          '2,Q2,2024-01-10,a,b,c,d,,E',
          '3,Q3,2024-01-10,a,b,,d,e,ক',
          '4,Q4,2024-01-10,a,b,c,d,e,F',
          '5,Q5,2024-01-10,a,b,c,d,e,',
        ]),
      ),
      { subjectHint: 'IBA', isIba: true },
    );
    expect(tx.questionUploadBatch.create.mock.calls[0]![0].data).toMatchObject({
      isIba: true,
      validCount: 1,
      invalidCount: 4,
    });
    const rows = rowsOf();
    expect(rows[0]).toMatchObject({ status: 'VALID', correctAnswer: 'E', optionE: 'e' });
    expect(rows[1]!.errorMessage).toBe(
      'Row 3: Answer is "E" (ঙ) but column "ঙ" (option E) is empty',
    );
    expect(rows[2]!.errorMessage).toBe('Row 4: Column "গ": option is required');
    expect(rows[3]!.errorMessage).toMatch(/^Row 5: Column "উত্তর": invalid answer "F"/);
    expect(rows[4]!.errorMessage).toMatch(/answer is required for IBA/);
  });

  it('(b) import of an IBA batch: 5 options with E correct, tagged iba; 4-option batch untouched', async () => {
    const importRow = {
      id: 'r1',
      contentHash: 'h',
      subjectName: 'IBA',
      topicName: null,
      difficulty: 'Medium',
      examCategory: 'IBA MBA Admission',
      examYear: '2024',
      questionDate: new Date('2024-01-10'),
      source: null,
      serial: '1',
      sectionTitle: null,
      questionText: 'Q1',
      explanation: null,
      optionA: 'a',
      optionB: 'b',
      optionC: 'c',
      optionD: 'd',
      optionE: 'e',
      correctAnswer: 'E',
    };
    const run = async (isIba: boolean, row: typeof importRow) => {
      const { service, prisma, tx } = setup();
      prisma.questionUploadBatch.findUniqueOrThrow.mockResolvedValue({
        id: 'b1',
        examYear: null,
        examCategoryHint: null,
        questionDate: null,
        isIba,
      });
      prisma.questionImportRow.findMany.mockResolvedValue([row]);
      await (
        service as unknown as { runImport: (u: unknown, id: string) => Promise<unknown> }
      ).runImport(user, 'b1');
      return tx.question.create.mock.calls[0]![0].data as {
        status: string;
        examTags: string[];
        options: { create: Array<{ label: string; isCorrect: boolean }> };
      };
    };

    const iba = await run(true, importRow);
    expect(iba.status).toBe('PUBLISHED');
    expect(iba.examTags).toEqual(['other-competitive', 'iba']);
    expect(iba.options.create.map((o) => `${o.label}${o.isCorrect ? '*' : ''}`)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E*',
    ]);

    const legacy = await run(false, { ...importRow, optionE: null as never, correctAnswer: 'B' });
    expect(legacy.examTags).toEqual(['other-competitive']);
    expect(legacy.options.create.map((o) => o.label)).toEqual(['A', 'B', 'C', 'D']);
  });
});
