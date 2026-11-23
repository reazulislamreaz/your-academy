import { BadRequestException, NotFoundException } from '@nestjs/common';
import { slugifyModelTestTitle } from '../../model-tests/model-test-slug';
import { slugifyExamTitle } from '../exam-slug';
import { ExamsService } from '../exams.service';

describe('ExamsService admin edit / delete', () => {
  const now = new Date('2026-11-23T10:00:00.000Z');
  const prisma = {
    exam: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    examQuestion: { findFirst: jest.fn(), update: jest.fn() },
  };
  const service = new ExamsService(prisma as never);

  const question = {
    id: 'q1',
    examId: 'e1',
    questionText: 'চর্যাপদ কোন যুগের নিদর্শন?',
    options: ['প্রাচীন', 'মধ্য', 'আধুনিক', 'কোনোটিই নয়'],
    correctAnswer: 'প্রাচীন',
    explanation: null,
    sortOrder: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.examQuestion.update.mockImplementation(async ({ data }) => ({ ...question, ...data }));
  });

  describe('updateQuestion', () => {
    it('stores the chosen option text as correctAnswer', async () => {
      prisma.examQuestion.findFirst.mockResolvedValue(question);
      const result = await service.updateQuestion('e1', 'q1', { correctOptionIndex: 1 });
      expect(prisma.examQuestion.update.mock.calls[0][0].data.correctAnswer).toBe('মধ্য');
      expect(result.correctOptionIndex).toBe(1);
    });

    it('keeps the same correct position when option texts are edited', async () => {
      prisma.examQuestion.findFirst.mockResolvedValue(question);
      await service.updateQuestion('e1', 'q1', {
        options: ['প্রাচীন যুগ', 'মধ্যযুগ', 'আধুনিক যুগ', 'কোনোটিই নয়'],
      });
      const data = prisma.examQuestion.update.mock.calls[0][0].data;
      expect(data.correctAnswer).toBe('প্রাচীন যুগ');
    });

    it('rejects duplicate options (answers are matched by text)', async () => {
      prisma.examQuestion.findFirst.mockResolvedValue(question);
      await expect(
        service.updateQuestion('e1', 'q1', { options: ['ক', 'ক', 'গ', 'ঘ'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.examQuestion.update).not.toHaveBeenCalled();
    });

    it('requires a correct option when the stored answer no longer matches', async () => {
      prisma.examQuestion.findFirst.mockResolvedValue({ ...question, correctAnswer: 'missing' });
      await expect(service.updateQuestion('e1', 'q1', { questionText: 'x' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('only edits questions that belong to the quiz', async () => {
      prisma.examQuestion.findFirst.mockResolvedValue(null);
      await expect(service.updateQuestion('other-exam', 'q1', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.examQuestion.findFirst).toHaveBeenCalledWith({
        where: { id: 'q1', examId: 'other-exam' },
      });
    });
  });

  describe('updateMeta', () => {
    it('updates details without touching the slug', async () => {
      prisma.exam.findUnique
        .mockResolvedValueOnce({ id: 'e1' })
        .mockResolvedValueOnce({
          id: 'e1', title: 'নতুন', slug: 'চর-য-পদ', description: null, totalQuestions: 1,
          durationInMinutes: 20, isPublished: false, createdAt: now, updatedAt: now,
          questions: [question], _count: { attempts: 3 },
        });
      const result = await service.updateMeta('e1', { title: ' নতুন ', durationInMinutes: 20, isPublished: false });
      const data = prisma.exam.update.mock.calls[0][0].data;
      expect(data).toEqual({ title: 'নতুন', durationInMinutes: 20, isPublished: false });
      expect(data).not.toHaveProperty('slug');
      expect(result.slug).toBe('চর-য-পদ');
    });

    it('404s for unknown quizzes', async () => {
      prisma.exam.findUnique.mockResolvedValue(null);
      await expect(service.updateMeta('nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the quiz and reports how many attempts went with it', async () => {
      prisma.exam.findUnique.mockResolvedValue({ id: 'e1', title: 'T', _count: { attempts: 4 } });
      await expect(service.remove('e1')).resolves.toMatchObject({ deleted: true, deletedAttempts: 4 });
      expect(prisma.exam.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });
  });
});

describe('Bangla slugs', () => {
  it.each([slugifyExamTitle, slugifyModelTestTitle])('keeps vowel signs and hasanta', (slugify) => {
    expect(slugify('চর্যাপদ')).toBe('চর্যাপদ');
    expect(slugify('বাংলা সাহিত্য — প্রাচীন যুগ')).toBe('বাংলা-সাহিত্য-প্রাচীন-যুগ');
    expect(slugify('BCS Preli 2024!')).toBe('bcs-preli-2024');
  });
});
