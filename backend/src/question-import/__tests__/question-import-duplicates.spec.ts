import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import { parseQuestionWorkbook } from '../excel-parser';
import { QuestionImportService } from '../question-import.service';

jest.mock('../excel-parser', () => {
  const actual = jest.requireActual('../excel-parser');
  return { ...actual, parseQuestionWorkbook: jest.fn() };
});

const mockedParse = parseQuestionWorkbook as jest.Mock;

describe('QuestionImportService — duplicate uploads', () => {
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

  it('re-uploading an identical completed file no longer throws DUPLICATE_FILE', async () => {
    const { prisma, tx } = makePrisma();
    const existingBatch = {
      id: 'old-batch-id',
      batchCode: 'OLD',
      displayName: 'Old file',
      status: 'COMPLETED',
    };
    prisma.questionUploadBatch.findFirst.mockResolvedValue(existingBatch);
    // Batch code is free; getBatch returns the new batch linked to the old one.
    prisma.questionUploadBatch.findUnique.mockImplementation(
      async (args: { where?: { batchCode?: string; id?: string } }) => {
      if (args?.where?.batchCode) return null;
      if (args?.where?.id === 'old-batch-id') return existingBatch;
      return {
        id: args.where.id,
        batchCode: 'BATCH_X',
        displayName: 'Test upload',
        status: 'VALIDATED',
        duplicateFileBatchId: 'old-batch-id',
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
        {
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
        },
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
    expect(batch.duplicateFileBatch).toEqual(
      expect.objectContaining({ id: 'old-batch-id', batchCode: 'OLD' }),
    );
    expect(tx.questionImportRow.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ status: 'VALID' }),
        ]),
      }),
    );
  });

  it('a confirm-time contentHash collision is skipped, not failed', async () => {
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
        questionText: 'What is 2 + 2?',
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
    prisma.questionImportRow.updateMany.mockResolvedValue({ count: 0 });
    prisma.questionImportRow.count.mockImplementation(
      async (args: { where?: { status?: string } }) =>
        args?.where?.status === 'SKIPPED' ? 1 : 0,
    );
    prisma.question.findFirst.mockResolvedValue(null);
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`content_hash`)',
      { code: 'P2002', clientVersion: '6.5.0' },
    );
    tx.question.create.mockRejectedValue(p2002);

    const service = new QuestionImportService(prisma as never);
    const result = await service.confirmImport(user, 'batch-1', {});

    expect(tx.questionImportRow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'row-1' },
        data: expect.objectContaining({
          status: 'SKIPPED',
          errorMessage: expect.stringContaining('Duplicate question'),
        }),
      }),
    );
    expect(prisma.questionUploadBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'batch-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          importedCount: 0,
          failedCount: 0,
          skippedCount: 1,
        }),
      }),
    );
    expect(result.status).toBe('VALIDATED');
  });
});
