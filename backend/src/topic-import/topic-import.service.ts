import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryScope, QuestionUploadStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { createHash, randomUUID } from 'crypto';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import {
  buildTopicTemplateBuffer,
  parseTopicWorkbook,
  resolveTopicAnswerKey,
} from './excel-parser';

@Injectable()
export class TopicImportService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplateBuffer(): Promise<Buffer> {
    return buildTopicTemplateBuffer();
  }

  private readonly batchInclude = {
    category: { select: { id: true, name: true } },
    subcategory: { select: { id: true, name: true, iconKey: true } },
    childCategory: { select: { id: true, name: true, iconKey: true } },
    uploadedBy: { select: { id: true, name: true } },
    _count: { select: { questions: true } },
  } as const;

  private mapBatchSummary(batch: {
    id: string;
    batchCode: string;
    displayName: string;
    originalFilename: string;
    status: string;
    totalRows: number;
    importedCount: number;
    createdAt: Date;
    category: { id: string; name: string };
    subcategory: { id: string; name: string; iconKey: string | null };
    childCategory: { id: string; name: string; iconKey: string | null } | null;
    uploadedBy: { id: string; name: string };
    _count: { questions: number };
  }) {
    return {
      id: batch.id,
      batchCode: batch.batchCode,
      displayName: batch.displayName,
      originalFilename: batch.originalFilename,
      status: batch.status,
      category: batch.category,
      subcategory: batch.subcategory,
      childCategory: batch.childCategory,
      totalRows: batch.totalRows,
      importedCount: batch.importedCount,
      questionCount: batch._count.questions,
      createdAt: batch.createdAt,
      uploadedBy: batch.uploadedBy,
    };
  }

  async listBatches(opts: { cursor?: string; limit?: number; q?: string } = {}) {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const q = opts.q?.trim();
    const where = q
      ? {
          OR: [
            { displayName: { contains: q, mode: 'insensitive' as const } },
            { batchCode: { contains: q, mode: 'insensitive' as const } },
            { originalFilename: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const rows = await this.prisma.topicUploadBatch.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: this.batchInclude,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map((row) => this.mapBatchSummary(row)),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  /** Hub stats — mirrors Written import stats cards (dup/failed stay 0; Topic never blocks). */
  async getStats() {
    const [aggregate, recent] = await Promise.all([
      this.prisma.topicUploadBatch.aggregate({
        _count: { id: true },
        _sum: { totalRows: true, importedCount: true },
      }),
      this.prisma.topicUploadBatch.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: this.batchInclude,
      }),
    ]);
    return {
      totalCollections: aggregate._count.id,
      totalRowsProcessed: aggregate._sum.totalRows ?? 0,
      successfullyImported: aggregate._sum.importedCount ?? 0,
      duplicateQuestions: 0,
      failedImports: 0,
      recentUploads: recent.map((row) => this.mapBatchSummary(row)),
    };
  }

  async upload(input: {
    file: Express.Multer.File;
    categoryId: string;
    subcategoryId: string;
    childCategoryId?: string | null;
    displayName?: string;
    uploadedById: string;
  }) {
    if (!input.file?.buffer?.length) {
      throw new BadRequestException(
        createErrorResponse('FILE_REQUIRED', 'Excel file is required', newRequestId()),
      );
    }
    const lower = (input.file.originalname || '').toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_FILE_TYPE',
          'Only .xlsx / .xls files are supported',
          newRequestId(),
        ),
      );
    }

    const category = await this.prisma.category.findFirst({
      where: {
        id: input.categoryId,
        scope: CategoryScope.TOPIC,
        parentId: null,
        isActive: true,
      },
    });
    if (!category) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_CATEGORY',
          'Select an active Topic Base category',
          newRequestId(),
        ),
      );
    }
    const subcategory = await this.prisma.category.findFirst({
      where: {
        id: input.subcategoryId,
        scope: CategoryScope.TOPIC,
        parentId: category.id,
        isActive: true,
      },
    });
    if (!subcategory) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_SUBCATEGORY',
          'Select an active Sub Category under the chosen Topic category',
          newRequestId(),
        ),
      );
    }

    let childCategoryId: string | null = null;
    const requestedChild = input.childCategoryId?.trim() || null;
    if (requestedChild) {
      const child = await this.prisma.category.findFirst({
        where: {
          id: requestedChild,
          scope: CategoryScope.TOPIC,
          parentId: subcategory.id,
          isActive: true,
        },
      });
      if (!child) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_CHILD_CATEGORY',
            'Select an active Child Category under the chosen Sub Category',
            newRequestId(),
          ),
        );
      }
      childCategoryId = child.id;
    }

    const parsed = await parseTopicWorkbook(input.file.buffer);
    const fileSha256 = createHash('sha256').update(input.file.buffer).digest('hex');
    const batchCode = `TB-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
    const displayName =
      input.displayName?.trim() ||
      input.file.originalname.replace(/\.(xlsx|xls)$/i, '').slice(0, 200) ||
      subcategory.name;

    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.topicUploadBatch.create({
        data: {
          batchCode,
          displayName: displayName.slice(0, 200),
          originalFilename: (input.file.originalname || 'upload.xlsx').slice(0, 255),
          fileSha256,
          categoryId: category.id,
          subcategoryId: subcategory.id,
          childCategoryId,
          status: 'COMPLETED',
          totalRows: parsed.rows.length,
          importedCount: parsed.rows.length,
          uploadedById: input.uploadedById,
          importedAt: new Date(),
          questions: {
            create: parsed.rows.map((row, index) => ({
              categoryId: category.id,
              subcategoryId: subcategory.id,
              childCategoryId,
              sourceSerial: row.sourceSerial,
              questionText: row.questionText,
              examLabel: row.examLabel,
              optionA: row.optionA,
              optionB: row.optionB,
              optionC: row.optionC,
              optionD: row.optionD,
              correctKey: row.correctKey,
              correctAnswer: row.correctAnswer,
              sortOrder: index,
              rowNumber: row.rowNumber,
            })),
          },
        },
        include: this.batchInclude,
      });
      return created;
    });

    const withUploader = await this.prisma.topicUploadBatch.findUniqueOrThrow({
      where: { id: batch.id },
      include: this.batchInclude,
    });
    return this.mapBatchSummary(withUploader);
  }

  async getBatch(id: string) {
    const batch = await this.prisma.topicUploadBatch.findUnique({
      where: { id },
      include: this.batchInclude,
    });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Topic upload batch not found', newRequestId()),
      );
    }
    return {
      ...this.mapBatchSummary(batch),
      categoryId: batch.categoryId,
      subcategoryId: batch.subcategoryId,
      childCategoryId: batch.childCategoryId,
      importedAt: batch.importedAt,
      fileSha256: batch.fileSha256,
    };
  }

  private async resolveTopicTaxonomy(input: {
    categoryId: string;
    subcategoryId: string;
    childCategoryId?: string | null;
  }) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: input.categoryId,
        scope: CategoryScope.TOPIC,
        parentId: null,
        isActive: true,
      },
    });
    if (!category) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_CATEGORY',
          'Select an active Topic Base category',
          newRequestId(),
        ),
      );
    }
    const subcategory = await this.prisma.category.findFirst({
      where: {
        id: input.subcategoryId,
        scope: CategoryScope.TOPIC,
        parentId: category.id,
        isActive: true,
      },
    });
    if (!subcategory) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_SUBCATEGORY',
          'Select an active Sub Category under the chosen Topic category',
          newRequestId(),
        ),
      );
    }

    let childCategoryId: string | null = null;
    const requestedChild = input.childCategoryId?.trim() || null;
    if (requestedChild) {
      const child = await this.prisma.category.findFirst({
        where: {
          id: requestedChild,
          scope: CategoryScope.TOPIC,
          parentId: subcategory.id,
          isActive: true,
        },
      });
      if (!child) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_CHILD_CATEGORY',
            'Select an active Child Category under the chosen Sub Category',
            newRequestId(),
          ),
        );
      }
      childCategoryId = child.id;
    }

    return { category, subcategory, childCategoryId };
  }

  private resolveCorrectFields(input: {
    correctAnswer?: string | null;
    correctKey?: string | null;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
  }): { correctKey: 'a' | 'b' | 'c' | 'd' | null; correctAnswer: string | null } {
    const fromKey =
      input.correctKey != null && String(input.correctKey).trim()
        ? resolveTopicAnswerKey(String(input.correctKey))
        : null;
    const fromAnswer =
      input.correctAnswer != null && String(input.correctAnswer).trim()
        ? resolveTopicAnswerKey(String(input.correctAnswer))
        : null;
    const correctKey = fromKey ?? fromAnswer;
    const options = {
      a: input.optionA,
      b: input.optionB,
      c: input.optionC,
      d: input.optionD,
    } as const;
    return {
      correctKey,
      correctAnswer: correctKey ? options[correctKey] || null : null,
    };
  }

  private mapQuestion(q: {
    id: string;
    sourceSerial: string | null;
    questionText: string;
    examLabel: string | null;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctKey: string | null;
    correctAnswer: string | null;
    sortOrder: number;
    rowNumber: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: q.id,
      sourceSerial: q.sourceSerial,
      questionText: q.questionText,
      examLabel: q.examLabel,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctKey: q.correctKey,
      correctAnswer: q.correctAnswer,
      sortOrder: q.sortOrder,
      rowNumber: q.rowNumber,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }

  async updateBatch(
    id: string,
    dto: {
      displayName?: string;
      categoryId?: string;
      subcategoryId?: string;
      childCategoryId?: string | null;
    },
  ) {
    const existing = await this.prisma.topicUploadBatch.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Topic upload batch not found', newRequestId()),
      );
    }

    const nextCategoryId = dto.categoryId ?? existing.categoryId;
    const nextSubcategoryId = dto.subcategoryId ?? existing.subcategoryId;
    const nextChildCategoryId =
      dto.childCategoryId !== undefined ? dto.childCategoryId : existing.childCategoryId;

    const taxonomyChanging =
      nextCategoryId !== existing.categoryId ||
      nextSubcategoryId !== existing.subcategoryId ||
      nextChildCategoryId !== existing.childCategoryId;

    const taxonomy = taxonomyChanging
      ? await this.resolveTopicTaxonomy({
          categoryId: nextCategoryId,
          subcategoryId: nextSubcategoryId,
          childCategoryId: nextChildCategoryId,
        })
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.topicUploadBatch.update({
        where: { id },
        data: {
          ...(dto.displayName !== undefined
            ? { displayName: dto.displayName.trim().slice(0, 200) || existing.displayName }
            : {}),
          ...(taxonomy
            ? {
                categoryId: taxonomy.category.id,
                subcategoryId: taxonomy.subcategory.id,
                childCategoryId: taxonomy.childCategoryId,
              }
            : {}),
        },
      });

      if (taxonomy) {
        await tx.topicQuestion.updateMany({
          where: { batchId: id },
          data: {
            categoryId: taxonomy.category.id,
            subcategoryId: taxonomy.subcategory.id,
            childCategoryId: taxonomy.childCategoryId,
          },
        });
      }
    });

    return this.getBatch(id);
  }

  async listQuestions(
    batchId: string,
    opts: { cursor?: string; limit?: number } = {},
  ) {
    await this.getBatch(batchId);
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const rows = await this.prisma.topicQuestion.findMany({
      where: { batchId },
      orderBy: [{ sortOrder: 'asc' }, { rowNumber: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(opts.cursor
        ? {
            skip: 1,
            cursor: { id: opts.cursor },
          }
        : {}),
    });
    const nextCursor = rows.length > limit ? rows[limit - 1]?.id ?? null : null;
    const page = rows.slice(0, limit);
    return {
      items: page.map((q) => this.mapQuestion(q)),
      nextCursor,
      limit,
    };
  }

  async updateQuestion(
    batchId: string,
    questionId: string,
    dto: {
      sourceSerial?: string | null;
      questionText?: string;
      examLabel?: string | null;
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswer?: string | null;
      correctKey?: string | null;
      sortOrder?: number;
      rowNumber?: number;
    },
  ) {
    const existing = await this.prisma.topicQuestion.findFirst({
      where: { id: questionId, batchId },
    });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Topic question not found', newRequestId()),
      );
    }

    const optionA = dto.optionA !== undefined ? dto.optionA : existing.optionA;
    const optionB = dto.optionB !== undefined ? dto.optionB : existing.optionB;
    const optionC = dto.optionC !== undefined ? dto.optionC : existing.optionC;
    const optionD = dto.optionD !== undefined ? dto.optionD : existing.optionD;
    const correct =
      dto.correctAnswer !== undefined || dto.correctKey !== undefined
        ? this.resolveCorrectFields({
            correctAnswer: dto.correctAnswer ?? existing.correctAnswer,
            correctKey: dto.correctKey ?? existing.correctKey,
            optionA,
            optionB,
            optionC,
            optionD,
          })
        : dto.optionA !== undefined ||
            dto.optionB !== undefined ||
            dto.optionC !== undefined ||
            dto.optionD !== undefined
          ? this.resolveCorrectFields({
              correctKey: existing.correctKey,
              correctAnswer: existing.correctAnswer,
              optionA,
              optionB,
              optionC,
              optionD,
            })
          : null;

    const updated = await this.prisma.topicQuestion.update({
      where: { id: questionId },
      data: {
        ...(dto.sourceSerial !== undefined
          ? { sourceSerial: dto.sourceSerial?.trim().slice(0, 32) || null }
          : {}),
        ...(dto.questionText !== undefined
          ? { questionText: dto.questionText.trim() || existing.questionText }
          : {}),
        ...(dto.examLabel !== undefined
          ? { examLabel: dto.examLabel?.trim().slice(0, 240) || null }
          : {}),
        ...(dto.optionA !== undefined ? { optionA } : {}),
        ...(dto.optionB !== undefined ? { optionB } : {}),
        ...(dto.optionC !== undefined ? { optionC } : {}),
        ...(dto.optionD !== undefined ? { optionD } : {}),
        ...(correct
          ? { correctKey: correct.correctKey, correctAnswer: correct.correctAnswer }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: Number(dto.sortOrder) || 0 } : {}),
        ...(dto.rowNumber !== undefined
          ? { rowNumber: Math.max(1, Number(dto.rowNumber) || existing.rowNumber) }
          : {}),
      },
    });
    return this.mapQuestion(updated);
  }

  async createQuestion(
    batchId: string,
    dto: {
      sourceSerial?: string | null;
      questionText?: string;
      examLabel?: string | null;
      optionA?: string;
      optionB?: string;
      optionC?: string;
      optionD?: string;
      correctAnswer?: string | null;
      correctKey?: string | null;
    },
  ) {
    const batch = await this.prisma.topicUploadBatch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Topic upload batch not found', newRequestId()),
      );
    }

    const optionA = dto.optionA?.trim() ?? '';
    const optionB = dto.optionB?.trim() ?? '';
    const optionC = dto.optionC?.trim() ?? '';
    const optionD = dto.optionD?.trim() ?? '';
    const correct = this.resolveCorrectFields({
      correctAnswer: dto.correctAnswer,
      correctKey: dto.correctKey,
      optionA,
      optionB,
      optionC,
      optionD,
    });

    const agg = await this.prisma.topicQuestion.aggregate({
      where: { batchId },
      _max: { sortOrder: true, rowNumber: true },
    });
    const nextSort = (agg._max.sortOrder ?? -1) + 1;
    const nextRow = (agg._max.rowNumber ?? 0) + 1;

    const created = await this.prisma.$transaction(async (tx) => {
      const question = await tx.topicQuestion.create({
        data: {
          batchId,
          categoryId: batch.categoryId,
          subcategoryId: batch.subcategoryId,
          childCategoryId: batch.childCategoryId,
          sourceSerial: dto.sourceSerial?.trim().slice(0, 32) || null,
          questionText: dto.questionText?.trim() || 'Untitled question',
          examLabel: dto.examLabel?.trim().slice(0, 240) || null,
          optionA,
          optionB,
          optionC,
          optionD,
          correctKey: correct.correctKey,
          correctAnswer: correct.correctAnswer,
          sortOrder: nextSort,
          rowNumber: nextRow,
        },
      });
      await tx.topicUploadBatch.update({
        where: { id: batchId },
        data: {
          totalRows: { increment: 1 },
          importedCount: { increment: 1 },
        },
      });
      return question;
    });

    return this.mapQuestion(created);
  }

  async deleteQuestion(batchId: string, questionId: string) {
    const existing = await this.prisma.topicQuestion.findFirst({
      where: { id: questionId, batchId },
    });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_FOUND', 'Topic question not found', newRequestId()),
      );
    }
    const batch = await this.prisma.topicUploadBatch.findUniqueOrThrow({
      where: { id: batchId },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.topicQuestion.delete({ where: { id: questionId } });
      await tx.topicUploadBatch.update({
        where: { id: batchId },
        data: {
          totalRows: Math.max(0, batch.totalRows - 1),
          importedCount: Math.max(0, batch.importedCount - 1),
        },
      });
    });
    return { id: questionId, deleted: true };
  }

  async archiveBatch(id: string) {
    const batch = await this.prisma.topicUploadBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Topic upload batch not found', newRequestId()),
      );
    }
    await this.prisma.topicUploadBatch.update({
      where: { id },
      data: { status: QuestionUploadStatus.ARCHIVED },
    });
    return this.getBatch(id);
  }

  async deleteBatch(id: string) {
    const batch = await this.prisma.topicUploadBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Topic upload batch not found', newRequestId()),
      );
    }
    await this.prisma.topicUploadBatch.delete({ where: { id } });
    return { id, deleted: true };
  }
}
