import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { parseQuestionWorkbook } from '../excel-parser';
import { QuestionImportService } from '../question-import.service';

jest.mock('../excel-parser', () => {
  const actual = jest.requireActual('../excel-parser');
  return { ...actual, parseQuestionWorkbook: jest.fn() };
});

const mockedParse = parseQuestionWorkbook as jest.Mock;

describe('QuestionImportService — duplicates & blank stems allowed', () => {
  const user = { userId: 'admin-1', role: 'ADMIN' as const, sessionId: 's1' };
  let importDir: string;
  const oldImportDir = process.env.QUESTION_IMPORT_DIR;

  beforeEach(() => {
    importDir = mkdtempSync(path.join(tmpdir(), 'qa-import-'));
    process.env.QUESTION_IMPORT_DIR = importDir;
    jest.resetAllMocks();
  });

  afterEach(() => {
    rmSync(importDir, { recursive: true, force: true });
    if (oldImportDir === undefined) delete process.env.QUESTION_IMPORT_DIR;
    else process.env.QUESTION_IMPORT_DIR = oldImportDir;
  });

  function makeTx() {
    return {
      category: { create: jest.fn() },
      question: { create: jest.fn() },
      questionImportRow: { createMany: jest.fn(), update: jest.fn() },
      questionUploadBatch: { create: jest.fn() },
    };
  }

  type MockTx = ReturnType<typeof makeTx>;

  function makePrisma() {
    const tx: MockTx = makeTx();
    const prisma = {
      category: { findMany: jest.fn() },
      question: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      questionImportRow: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        createMany: jest.fn(),
      },
      questionUploadBatch: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: MockTx) => unknown) => cb(tx)),
    };
    return { prisma, tx };
  }

  function baseRow(overrides: Record<string, unknown> = {}) {
    return {
      rowNumber: 2,
      serial: '1',
      question: 'What is 2 + 2?',
      optionA: '3',
      optionB: '4',
      optionC: '5',
      optionD: '6',
      correctAnswer: 'B',
      explanation: '',
      subject: 'Bangla',
      topic: '',
      difficulty: 'Medium',
      examCategory: '',
      examYear: '',
      questionDate: '2024-01-15',
      source: '',
      sectionTitle: '',
      ...overrides,
    };
  }

  it('marks in-file duplicates and DB-matching rows as VALID (not DUPLICATE)', async () => {
    const { prisma, tx } = makePrisma();
    prisma.questionUploadBatch.findFirst.mockResolvedValue(null);
    prisma.questionUploadBatch.findUnique.mockImplementation(async (args: unknown) => {
      const where = (args as { where?: { batchCode?: string; id?: string } } | undefined)?.where;
      if (where?.batchCode) return null;
      return {
        id: where?.id ?? 'new-batch',
        batchCode: 'BATCH_X',
        displayName: 'Test upload',
        status: 'VALIDATED',
        duplicateFileBatchId: null,
        validCount: 3,
        invalidCount: 0,
        duplicateCount: 0,
        uploadedBy: { id: 'admin-1', name: 'Admin' },
        placements: [],
      };
    });
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1', slug: 'bangla', name: 'Bangla', children: [] },
    ]);
    prisma.question.findMany.mockResolvedValue([]);
    mockedParse.mockResolvedValue({
      preamble: '',
      rows: [
        baseRow({ rowNumber: 2 }),
        baseRow({ rowNumber: 3 }), // identical within file
        baseRow({ rowNumber: 4, question: '' }), // blank stem
      ],
    });

    const service = new QuestionImportService(prisma as never);
    const file = {
      buffer: Buffer.from('fake-xlsx'),
      originalname: 'questions.xlsx',
      size: 9,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Express.Multer.File;

    const batch = await service.upload(user, file, { subjectHint: 'Bangla' });

    expect(batch.status).toBe('VALIDATED');
    const createManyArg = tx.questionImportRow.createMany.mock.calls[0]![0] as {
      data: Array<{ status: string; questionText: string; rowNumber: number }>;
    };
    expect(createManyArg.data).toHaveLength(3);
    expect(createManyArg.data.every((r) => r.status === 'VALID')).toBe(true);
    expect(createManyArg.data.find((r) => r.rowNumber === 4)?.questionText).toBe('');
    expect(tx.questionUploadBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validCount: 3,
          invalidCount: 0,
          duplicateCount: 0,
        }),
      }),
    );
  });

  it('marks missing and placeholder answers as VALID (not INVALID)', async () => {
    const { prisma, tx } = makePrisma();
    prisma.questionUploadBatch.findFirst.mockResolvedValue(null);
    prisma.questionUploadBatch.findUnique.mockImplementation(async (args: unknown) => {
      const where = (args as { where?: { batchCode?: string; id?: string } } | undefined)?.where;
      if (where?.batchCode) return null;
      return {
        id: where?.id ?? 'new-batch',
        batchCode: 'BATCH_MIX',
        displayName: 'Mixed answers',
        status: 'VALIDATED',
        duplicateFileBatchId: null,
        validCount: 3,
        invalidCount: 0,
        duplicateCount: 0,
        uploadedBy: { id: 'admin-1', name: 'Admin' },
        placements: [],
      };
    });
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1', slug: 'bangla', name: 'Bangla', children: [] },
    ]);
    prisma.question.findMany.mockResolvedValue([]);
    mockedParse.mockResolvedValue({
      preamble: '',
      rows: [
        baseRow({ rowNumber: 2, correctAnswer: 'B' }),
        baseRow({ rowNumber: 3, question: 'Unanswered Q?', correctAnswer: '' }),
        baseRow({ rowNumber: 4, question: 'Dash placeholder Q?', correctAnswer: '-' }),
        baseRow({ rowNumber: 5, question: 'N/A placeholder Q?', correctAnswer: 'N/A' }),
        // Real sheets often put "Note" in উত্তর when the answer is not set yet.
        baseRow({ rowNumber: 6, question: 'How many member are in FBCCI?', correctAnswer: 'Note' }),
      ],
    });

    const service = new QuestionImportService(prisma as never);
    const file = {
      buffer: Buffer.from('fake-xlsx'),
      originalname: 'mixed.xlsx',
      size: 9,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Express.Multer.File;

    await service.upload(user, file, { subjectHint: 'Bangla' });

    const createManyArg = tx.questionImportRow.createMany.mock.calls[0]![0] as {
      data: Array<{
        status: string;
        correctAnswer: string | null;
        errorMessage: string | null;
        rowNumber: number;
      }>;
    };
    expect(createManyArg.data).toHaveLength(5);
    expect(createManyArg.data.every((r) => r.status === 'VALID')).toBe(true);
    expect(createManyArg.data.every((r) => !r.errorMessage)).toBe(true);
    expect(createManyArg.data.find((r) => r.rowNumber === 2)?.correctAnswer).toBe('B');
    expect(createManyArg.data.find((r) => r.rowNumber === 3)?.correctAnswer).toBeNull();
    expect(createManyArg.data.find((r) => r.rowNumber === 4)?.correctAnswer).toBeNull();
    expect(createManyArg.data.find((r) => r.rowNumber === 5)?.correctAnswer).toBeNull();
    expect(createManyArg.data.find((r) => r.rowNumber === 6)?.correctAnswer).toBeNull();
    expect(tx.questionUploadBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validCount: 5,
          invalidCount: 0,
        }),
      }),
    );
  });

  it('still marks genuinely invalid answer letters as INVALID', async () => {
    const { prisma, tx } = makePrisma();
    prisma.questionUploadBatch.findFirst.mockResolvedValue(null);
    prisma.questionUploadBatch.findUnique.mockImplementation(async (args: unknown) => {
      const where = (args as { where?: { batchCode?: string; id?: string } } | undefined)?.where;
      if (where?.batchCode) return null;
      return {
        id: where?.id ?? 'new-batch',
        batchCode: 'BATCH_BAD',
        displayName: 'Bad answer',
        status: 'VALIDATED',
        duplicateFileBatchId: null,
        validCount: 0,
        invalidCount: 1,
        duplicateCount: 0,
        uploadedBy: { id: 'admin-1', name: 'Admin' },
        placements: [],
      };
    });
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1', slug: 'bangla', name: 'Bangla', children: [] },
    ]);
    prisma.question.findMany.mockResolvedValue([]);
    mockedParse.mockResolvedValue({
      preamble: '',
      rows: [baseRow({ rowNumber: 2, correctAnswer: 'maybe' })],
    });

    const service = new QuestionImportService(prisma as never);
    const file = {
      buffer: Buffer.from('fake-xlsx'),
      originalname: 'bad.xlsx',
      size: 9,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    } as Express.Multer.File;

    await service.upload(user, file, { subjectHint: 'Bangla' });

    const createManyArg = tx.questionImportRow.createMany.mock.calls[0]![0] as {
      data: Array<{ status: string; errorMessage: string | null }>;
    };
    expect(createManyArg.data).toHaveLength(1);
    expect(createManyArg.data[0]?.status).toBe('INVALID');
    expect(createManyArg.data[0]?.errorMessage).toMatch(/উত্তর/);
  });

  it('confirm imports unanswered rows as DRAFT and answered rows as PUBLISHED', async () => {
    const { prisma, tx } = makePrisma();
    const batch = {
      id: 'batch-1',
      batchCode: 'BATCH_1',
      displayName: 'Batch 1',
      status: 'VALIDATED',
      duplicateFileBatchId: null,
      uploadedBy: { id: 'admin-1', name: 'Admin' },
      placements: [],
    };
    prisma.questionUploadBatch.findUnique.mockResolvedValue(batch);
    prisma.questionUploadBatch.findUniqueOrThrow.mockResolvedValue({
      id: 'batch-1',
      examYear: null,
      examCategoryHint: null,
      questionDate: null,
    });
    prisma.questionUploadBatch.update.mockResolvedValue(batch);
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1', slug: 'bangla', name: 'Bangla', children: [] },
    ]);
    prisma.questionImportRow.findMany.mockResolvedValue([
      {
        id: 'row-answered',
        batchId: 'batch-1',
        status: 'VALID',
        rowNumber: 2,
        contentHash: 'hash-answered',
        serial: '1',
        questionText: 'Answered?',
        optionA: '3',
        optionB: '4',
        optionC: '5',
        optionD: '6',
        correctAnswer: 'B',
        explanation: null,
        subjectName: 'Bangla',
        topicName: null,
        difficulty: 'Medium',
        examCategory: null,
        examYear: '2024',
        questionDate: new Date('2024-01-15'),
        source: null,
        sectionTitle: null,
      },
      {
        id: 'row-unanswered',
        batchId: 'batch-1',
        status: 'VALID',
        rowNumber: 3,
        contentHash: 'hash-unanswered',
        serial: '2',
        questionText: 'Unanswered?',
        optionA: '3',
        optionB: '4',
        optionC: '5',
        optionD: '6',
        correctAnswer: null,
        explanation: null,
        subjectName: 'Bangla',
        topicName: null,
        difficulty: 'Medium',
        examCategory: null,
        examYear: '2024',
        questionDate: new Date('2024-01-15'),
        source: null,
        sectionTitle: null,
      },
    ]);
    prisma.questionImportRow.count.mockResolvedValue(0);
    prisma.question.findFirst.mockResolvedValue(null);
    tx.question.create
      .mockResolvedValueOnce({ id: 'q-answered' })
      .mockResolvedValueOnce({ id: 'q-unanswered' });

    const service = new QuestionImportService(prisma as never);
    await service.confirmImport(user, 'batch-1', { skipDuplicates: false });

    expect(tx.question.create).toHaveBeenCalledTimes(2);
    expect(tx.question.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PUBLISHED',
          options: {
            create: expect.arrayContaining([
              expect.objectContaining({ label: 'B', isCorrect: true }),
            ]),
          },
        }),
      }),
    );
    expect(tx.question.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'DRAFT',
          publishedAt: null,
          options: {
            create: [
              expect.objectContaining({ label: 'A', isCorrect: false }),
              expect.objectContaining({ label: 'B', isCorrect: false }),
              expect.objectContaining({ label: 'C', isCorrect: false }),
              expect.objectContaining({ label: 'D', isCorrect: false }),
            ],
          },
        }),
      }),
    );
    expect(tx.questionImportRow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'row-unanswered' },
        data: expect.objectContaining({ status: 'IMPORTED' }),
      }),
    );
  });

  it('confirm imports VALID rows including blank stems; does not skip duplicates', async () => {
    const { prisma, tx } = makePrisma();
    const batch = {
      id: 'batch-1',
      batchCode: 'BATCH_1',
      displayName: 'Batch 1',
      status: 'VALIDATED',
      duplicateFileBatchId: null,
      uploadedBy: { id: 'admin-1', name: 'Admin' },
      placements: [],
    };
    prisma.questionUploadBatch.findUnique.mockResolvedValue(batch);
    prisma.questionUploadBatch.findUniqueOrThrow.mockResolvedValue({
      id: 'batch-1',
      examYear: null,
      examCategoryHint: null,
      questionDate: null,
    });
    prisma.questionUploadBatch.update.mockResolvedValue(batch);
    prisma.category.findMany.mockResolvedValue([
      { id: 'cat-1', slug: 'bangla', name: 'Bangla', children: [] },
    ]);
    prisma.questionImportRow.findMany.mockResolvedValue([
      {
        id: 'row-1',
        batchId: 'batch-1',
        status: 'VALID',
        rowNumber: 2,
        contentHash: 'abc123',
        serial: '1',
        questionText: '',
        optionA: '3',
        optionB: '4',
        optionC: '5',
        optionD: '6',
        correctAnswer: 'B',
        explanation: null,
        subjectName: 'Bangla',
        topicName: null,
        difficulty: 'Medium',
        examCategory: null,
        examYear: '2024',
        questionDate: new Date('2024-01-15'),
        source: null,
        sectionTitle: null,
      },
    ]);
    prisma.questionImportRow.count.mockResolvedValue(0);
    prisma.question.findFirst.mockResolvedValue(null);
    tx.question.create.mockResolvedValue({ id: 'new-q-1' });

    const service = new QuestionImportService(prisma as never);
    await service.confirmImport(user, 'batch-1', { skipDuplicates: true });

    expect(tx.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: '(blank)',
          content: '',
          contentHash: 'abc123',
        }),
      }),
    );
    expect(tx.questionImportRow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'row-1' },
        data: expect.objectContaining({ status: 'IMPORTED' }),
      }),
    );
    // Even if client asks to skip duplicates, we must not mark DUPLICATE rows skipped.
    expect(prisma.questionImportRow.updateMany).not.toHaveBeenCalled();
  });
});
