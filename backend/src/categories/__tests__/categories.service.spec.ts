import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryScope } from '@prisma/client';
import { CategoriesService } from '../categories.service';

describe('CategoriesService', () => {
  const prisma = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    question: { count: jest.fn() },
    writtenQuestion: { count: jest.fn() },
    document: { count: jest.fn() },
    practiceSet: { count: jest.fn() },
  };
  const audit = { record: jest.fn() };
  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(prisma as never, audit as never);
  });

  it('rejects duplicate root category names within the same scope', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: '1', name: 'বাংলা' }]);
    await expect(
      service.create({ name: 'বাংলা', scope: CategoryScope.PRELIMINARY }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows the same name in Written vs Preliminary scopes', async () => {
    prisma.category.findMany.mockResolvedValue([]);
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'new',
      ...data,
    }));

    const created = await service.create({ name: 'বাংলা', scope: CategoryScope.WRITTEN });
    expect(created).toMatchObject({
      name: 'বাংলা',
      scope: CategoryScope.WRITTEN,
      parentId: null,
    });
  });

  it('rejects subcategory under another subcategory', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'child',
      parentId: 'root',
      name: 'Topic',
      scope: CategoryScope.PRELIMINARY,
    });
    await expect(service.create({ name: 'Deep', parentId: 'child' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects scope mismatch and inherits parent Written scope', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'root',
      parentId: null,
      name: 'Written Root',
      scope: CategoryScope.WRITTEN,
    });
    prisma.category.findMany.mockResolvedValue([]);
    prisma.category.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'child',
      ...data,
    }));

    await expect(
      service.create({
        name: 'Essay',
        parentId: 'root',
        scope: CategoryScope.PRELIMINARY,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.create({ name: 'Essay', parentId: 'root' });
    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scope: CategoryScope.WRITTEN, parentId: 'root' }),
      }),
    );
  });

  it('creates a root category with generated slug', async () => {
    prisma.category.findMany.mockResolvedValue([]);
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'new',
      ...data,
    }));

    const created = await service.create({ name: 'Mathematics' });
    expect(created).toMatchObject({
      name: 'Mathematics',
      isActive: true,
      parentId: null,
      scope: CategoryScope.PRELIMINARY,
    });
    expect(prisma.category.create).toHaveBeenCalled();
  });

  it('blocks hard delete when questions exist', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'cat',
      name: 'Bangla',
      parentId: null,
      scope: CategoryScope.PRELIMINARY,
    });
    prisma.category.count.mockResolvedValue(0);
    prisma.question.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    prisma.writtenQuestion.count.mockResolvedValue(0);
    prisma.document.count.mockResolvedValue(0);
    prisma.practiceSet.count.mockResolvedValue(0);

    await expect(service.remove('cat', 'admin', true)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('hard deletes unused categories', async () => {
    prisma.category.findUnique.mockResolvedValue({
      id: 'cat',
      name: 'Orphan',
      parentId: null,
      scope: CategoryScope.WRITTEN,
    });
    prisma.category.count.mockResolvedValue(0);
    prisma.question.count.mockResolvedValue(0);
    prisma.writtenQuestion.count.mockResolvedValue(0);
    prisma.document.count.mockResolvedValue(0);
    prisma.practiceSet.count.mockResolvedValue(0);
    prisma.category.delete.mockResolvedValue({});

    await expect(service.remove('cat', 'admin', true)).resolves.toEqual({ id: 'cat', deleted: true });
    expect(prisma.category.delete).toHaveBeenCalled();
  });

  it('returns not found for missing parent', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ name: 'Child', parentId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
