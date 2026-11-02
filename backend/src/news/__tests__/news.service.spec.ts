import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NewsService } from '../news.service';

describe('NewsService', () => {
  const prisma = {
    news: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    document: { count: jest.fn() },
    newsDocument: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const service = new NewsService(prisma as never);
  const user = { userId: 'admin-1', role: 'ADMIN' as const, sessionId: 's1' };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('listPublished only queries published non-deleted articles', async () => {
    prisma.news.findMany.mockResolvedValue([]);
    await service.listPublished();
    expect(prisma.news.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true, deletedAt: null },
      }),
    );
  });

  it('getBySlug filters linked docs to published', async () => {
    prisma.news.findFirst.mockResolvedValue({
      id: 'n1',
      title: 'Hello',
      slug: 'hello',
      summary: null,
      body: 'Body',
      publishedAt: new Date(),
      documents: [
        {
          document: {
            id: 'd1',
            title: 'PDF',
            description: null,
            visibility: 'AUTHENTICATED',
          },
        },
      ],
    });

    const article = await service.getBySlug('hello');
    expect(article.documents).toEqual([
      {
        id: 'd1',
        title: 'PDF',
        description: null,
        visibility: 'AUTHENTICATED',
      },
    ]);
    expect(prisma.news.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'hello', isPublished: true, deletedAt: null },
        include: expect.objectContaining({
          documents: expect.objectContaining({
            where: { document: { isPublished: true, deletedAt: null } },
          }),
        }),
      }),
    );
  });

  it('getBySlug 404 when unpublished/missing', async () => {
    prisma.news.findFirst.mockResolvedValue(null);
    await expect(service.getBySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create rejects unknown document ids', async () => {
    prisma.document.count.mockResolvedValue(0);
    await expect(
      service.create(user, {
        title: 'T',
        slug: 't',
        body: 'Body text',
        documentIds: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create associates documents in a transaction', async () => {
    prisma.document.count.mockResolvedValue(1);
    const created = { id: 'n1', title: 'T', slug: 't' };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
    prisma.news.create.mockResolvedValue(created);
    prisma.newsDocument.createMany.mockResolvedValue({ count: 1 });

    await expect(
      service.create(user, {
        title: 'Title here',
        slug: 'title-here',
        body: 'Body text',
        documentIds: ['11111111-1111-4111-8111-111111111111'],
      }),
    ).resolves.toEqual(created);

    expect(prisma.newsDocument.createMany).toHaveBeenCalledWith({
      data: [
        {
          newsId: 'n1',
          documentId: '11111111-1111-4111-8111-111111111111',
          sortOrder: 0,
        },
      ],
    });
  });
});
