import { PublicService } from '../public.service';

/** DEC-051 — public routes never ship answer keys / model answers to non-entitled viewers. */
describe('PublicService answer privacy (DEC-051)', () => {
  const now = new Date('2026-11-23T10:00:00.000Z');
  const prisma = {
    question: { count: jest.fn(), findMany: jest.fn() },
    questionUploadBatch: { findFirst: jest.fn() },
    questionImportRow: { findMany: jest.fn() },
    writtenUploadBatch: { findFirst: jest.fn() },
    writtenImportRow: { findMany: jest.fn() },
    writtenQuestion: { findMany: jest.fn() },
    topicUploadBatch: { findFirst: jest.fn() },
    topicQuestion: { count: jest.fn(), findMany: jest.fn() },
  };
  const service = new PublicService(prisma as never);
  const anon = { canViewAnswers: false };
  const entitled = { canViewAnswers: true };

  const mcq = {
    id: 'q1',
    title: 'Capital?',
    content: 'Capital of Bangladesh?',
    difficulty: 'EASY',
    examTags: [],
    sourceNote: null,
    sourceSerial: '1',
    examYear: null,
    sectionTitle: null,
    createdAt: now,
    publishedAt: now,
    uploadBatchId: 'b1',
    category: { id: 'c1', name: 'GK', slug: 'gk' },
    subcategory: null,
    options: [
      { id: 'o1', label: 'A', content: 'Dhaka', sortOrder: 0, isCorrect: true },
      { id: 'o2', label: 'B', content: 'Khulna', sortOrder: 1, isCorrect: false },
    ],
    importRows: [{ rowNumber: 1, serial: '1', sectionTitle: null }],
  };

  const batch = {
    id: 'b1',
    batchCode: 'B1',
    displayName: 'Set',
    description: null,
    subjectHint: null,
    topicHint: null,
    examCategoryHint: null,
    examYear: null,
    sheetPreamble: null,
    createdAt: now,
    importedAt: now,
    placements: [],
    _count: { questions: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.question.count.mockResolvedValue(1);
    prisma.question.findMany.mockResolvedValue([mcq]);
    prisma.questionUploadBatch.findFirst.mockResolvedValue(batch);
    prisma.writtenUploadBatch.findFirst.mockResolvedValue(batch);
    prisma.questionImportRow.findMany.mockResolvedValue([
      { rowNumber: 1, createdQuestionId: 'q1' },
    ]);
  });

  describe('Preli bank cards', () => {
    it('omits the answer key for anonymous / free viewers (absent, not faked)', async () => {
      const { items } = await service.listPublishedQuestions({ limit: 20 }, anon);
      expect(items).toHaveLength(1);
      expect(items[0]).not.toHaveProperty('correctAnswerLabel');
      expect(items[0]).not.toHaveProperty('correctAnswerBn');
      expect(items[0].options[0]).not.toHaveProperty('isCorrect');
      expect(JSON.stringify(items)).not.toContain('isCorrect');
    });

    it('defaults to the non-entitled view when no viewer context is passed', async () => {
      const { items } = await service.listPublishedQuestions({ limit: 20 });
      expect(items[0]).not.toHaveProperty('correctAnswerLabel');
    });

    it('includes the key for entitled viewers', async () => {
      const { items } = await service.listPublishedQuestions({ limit: 20 }, entitled);
      expect(items[0].correctAnswerLabel).toBe('A');
      expect(items[0].correctAnswerBn).toBe('ক');
      expect(items[0].options[0]).not.toHaveProperty('isCorrect');
    });

    it('gates set questions the same way', async () => {
      prisma.question.findMany
        .mockResolvedValueOnce([]) // orphan lookup
        .mockResolvedValueOnce([mcq]);
      const free = await service.listSetQuestions('b1', { limit: 20 }, anon);
      expect(free.items[0]).not.toHaveProperty('correctAnswerLabel');

      prisma.question.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([mcq]);
      const paid = await service.listSetQuestions('b1', { limit: 20 }, entitled);
      expect(paid.items[0].correctAnswerLabel).toBe('A');
    });
  });

  describe('Preli practice scoring', () => {
    beforeEach(() => {
      prisma.question.findMany.mockReset();
      prisma.question.findMany
        .mockResolvedValueOnce([]) // orphan lookup
        .mockResolvedValueOnce([{ id: 'q1', options: mcq.options }]);
    });

    it('returns totals and own selections only for non-entitled viewers', async () => {
      const result = await service.scoreSetPractice('b1', { q1: 'o1' }, anon);
      expect(result).toMatchObject({
        totalQuestions: 1,
        correctCount: 1,
        wrongCount: 0,
        skippedCount: 0,
        answersVisible: false,
      });
      expect(result.answerSheet[0]).toEqual({ id: 'q1', selectedOptionId: 'o1', isSkipped: false });
    });

    it('adds per-question correctness and key for entitled viewers', async () => {
      const result = await service.scoreSetPractice('b1', { q1: 'o2' }, entitled);
      expect(result.wrongCount).toBe(1);
      expect(result.answerSheet[0]).toMatchObject({
        isCorrect: false,
        correctOptionId: 'o1',
        correctAnswerLabel: 'A',
      });
    });

    it('ignores forged option ids', async () => {
      const result = await service.scoreSetPractice('b1', { q1: 'not-an-option' }, anon);
      expect(result.skippedCount).toBe(1);
      expect(result.answerSheet[0].selectedOptionId).toBeNull();
    });
  });

  describe('Written bank', () => {
    const written = {
      id: 'w1',
      title: 'Explain',
      content: 'Explain X',
      modelAnswer: 'Secret model answer',
      marks: 5,
      sourceSerial: null,
      examYear: null,
      sectionTitle: null,
      createdAt: now,
      publishedAt: now,
      uploadBatchId: 'b1',
      category: { id: 'c1', name: 'GK', slug: 'gk' },
      subcategory: null,
    };

    beforeEach(() => {
      prisma.writtenImportRow.findMany.mockResolvedValue([
        { rowNumber: 1, createdQuestionId: 'w1' },
      ]);
      prisma.writtenQuestion.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([written]);
    });

    it('omits modelAnswer and does not search inside it for free viewers', async () => {
      const { items } = await service.listWrittenSetQuestions('b1', { limit: 20, q: 'Secret' }, anon);
      expect(items[0]).not.toHaveProperty('modelAnswer');
      expect(JSON.stringify(items)).not.toContain('Secret model answer');
      const where = JSON.stringify(prisma.writtenImportRow.findMany.mock.calls[0][0].where);
      expect(where).not.toContain('modelAnswer');
    });

    it('returns modelAnswer for entitled viewers', async () => {
      const { items } = await service.listWrittenSetQuestions('b1', { limit: 20 }, entitled);
      expect(items[0].modelAnswer).toBe('Secret model answer');
    });
  });

  describe('Topic sets', () => {
    const topic = {
      id: 't1',
      batchId: 'tb1',
      questionText: 'Topic Q',
      optionA: 'a',
      optionB: 'b',
      optionC: 'c',
      optionD: 'd',
      correctKey: 'c',
      examLabel: null,
      sourceSerial: null,
      rowNumber: 1,
      createdAt: now,
      category: { id: 'c1', name: 'T', slug: 't' },
      subcategory: null,
      childCategory: null,
    };

    beforeEach(() => {
      prisma.topicUploadBatch.findFirst.mockResolvedValue({
        id: 'tb1',
        batchCode: 'T1',
        displayName: 'Topic set',
        createdAt: now,
        importedAt: null,
        categoryId: 'c1',
        subcategoryId: 's1',
        childCategoryId: null,
        category: null,
        subcategory: null,
        childCategory: null,
        _count: { questions: 1 },
      });
      prisma.topicQuestion.count.mockResolvedValue(1);
      prisma.topicQuestion.findMany.mockResolvedValue([topic]);
    });

    it('omits the key for free viewers', async () => {
      const { items } = await service.listTopicSetQuestions({ batchId: 'tb1', limit: 20 }, anon);
      expect(items[0]).not.toHaveProperty('correctAnswerLabel');
      expect(items[0]).not.toHaveProperty('correctKey');
    });

    it('includes the key for entitled viewers', async () => {
      const { items } = await service.listTopicSetQuestions(
        { batchId: 'tb1', limit: 20 },
        entitled,
      );
      expect(items[0].correctAnswerLabel).toBe('C');
      expect(items[0].correctAnswerBn).toBe('গ');
    });
  });
});
