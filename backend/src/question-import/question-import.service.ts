import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Difficulty,
  Prisma,
  QuestionImportRowStatus,
  QuestionStatus,
  QuestionUploadStatus,
} from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { createWriteStream, existsSync, mkdirSync, promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { mapExamCategoryToTag, parseDifficulty } from './exam-tag-map';
import {
  buildImportReportBuffer,
  buildTemplateBuffer,
  parseQuestionWorkbook,
  type ParsedImportRow,
} from './excel-parser';
import { hashFileBuffer, hashQuestionContent, slugifyBatchCode } from './question-normalize';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_ROWS = 5000;

@Injectable()
export class QuestionImportService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadRoot(): string {
    const root =
      process.env.QUESTION_IMPORT_DIR?.trim() ||
      path.join(process.cwd(), 'storage', 'question-imports');
    if (!existsSync(root)) mkdirSync(root, { recursive: true });
    return root;
  }

  async getTemplateBuffer(): Promise<Buffer> {
    return buildTemplateBuffer();
  }

  async getStats() {
    const [totalCollections, aggregates, recentUploads] = await Promise.all([
      this.prisma.questionUploadBatch.count(),
      this.prisma.questionUploadBatch.aggregate({
        _sum: {
          importedCount: true,
          duplicateCount: true,
          invalidCount: true,
          failedCount: true,
          skippedCount: true,
          totalRows: true,
        },
      }),
      this.prisma.questionUploadBatch.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          batchCode: true,
          displayName: true,
          status: true,
          importedCount: true,
          totalRows: true,
          createdAt: true,
          uploadedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const sum = aggregates._sum;
    return {
      totalCollections,
      totalRowsProcessed: sum.totalRows ?? 0,
      successfullyImported: sum.importedCount ?? 0,
      duplicateQuestions: (sum.duplicateCount ?? 0) + (sum.skippedCount ?? 0),
      failedImports: (sum.invalidCount ?? 0) + (sum.failedCount ?? 0),
      recentUploads,
    };
  }

  async listBatches(params: {
    cursor?: string;
    limit?: number;
    status?: QuestionUploadStatus;
    q?: string;
    subject?: string;
    examCategory?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (params.dateFrom) {
      const from = new Date(params.dateFrom);
      if (!Number.isNaN(from.getTime())) createdAtFilter.gte = from;
    }
    if (params.dateTo) {
      const to = new Date(params.dateTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        createdAtFilter.lte = to;
      }
    }

    const orderBy: Prisma.QuestionUploadBatchOrderByWithRelationInput[] = (() => {
      switch (params.sort) {
        case 'createdAt_asc':
          return [{ createdAt: 'asc' }, { id: 'asc' }];
        case 'importedCount_desc':
          return [{ importedCount: 'desc' }, { createdAt: 'desc' }];
        case 'totalRows_desc':
          return [{ totalRows: 'desc' }, { createdAt: 'desc' }];
        default:
          return [{ createdAt: 'desc' }, { id: 'desc' }];
      }
    })();

    const items = await this.prisma.questionUploadBatch.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.subject
          ? { subjectHint: { contains: params.subject, mode: 'insensitive' } }
          : {}),
        ...(params.examCategory
          ? { examCategoryHint: { contains: params.examCategory, mode: 'insensitive' } }
          : {}),
        ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
        ...(params.q
          ? {
              OR: [
                { batchCode: { contains: params.q, mode: 'insensitive' } },
                { displayName: { contains: params.q, mode: 'insensitive' } },
                { originalFilename: { contains: params.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy,
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async updateBatch(
    id: string,
    dto: {
      displayName?: string;
      description?: string | null;
      subjectHint?: string | null;
      topicHint?: string | null;
      examCategoryHint?: string | null;
    },
  ) {
    await this.getBatch(id);
    return this.prisma.questionUploadBatch.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim().slice(0, 200) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.subjectHint !== undefined
          ? { subjectHint: dto.subjectHint?.trim().slice(0, 120) || null }
          : {}),
        ...(dto.topicHint !== undefined
          ? { topicHint: dto.topicHint?.trim().slice(0, 120) || null }
          : {}),
        ...(dto.examCategoryHint !== undefined
          ? { examCategoryHint: dto.examCategoryHint?.trim().slice(0, 120) || null }
          : {}),
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  async getBatch(id: string) {
    const batch = await this.prisma.questionUploadBatch.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Upload batch not found', newRequestId()),
      );
    }
    let duplicateFileBatch: { id: string; batchCode: string; displayName: string } | null = null;
    if (batch.duplicateFileBatchId) {
      duplicateFileBatch = await this.prisma.questionUploadBatch.findUnique({
        where: { id: batch.duplicateFileBatchId },
        select: { id: true, batchCode: true, displayName: true },
      });
    }
    return { ...batch, duplicateFileBatch };
  }

  async listRows(
    batchId: string,
    params: { cursor?: string; limit?: number; status?: QuestionImportRowStatus },
  ) {
    await this.getBatch(batchId);
    const limit = Math.min(params.limit ?? 50, 200);
    const items = await this.prisma.questionImportRow.findMany({
      where: {
        batchId,
        ...(params.status ? { status: params.status } : {}),
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ rowNumber: 'asc' }],
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async upload(
    user: RequestUser,
    file: Express.Multer.File,
    input: {
      batchCode?: string;
      displayName?: string;
      description?: string;
      subjectHint?: string;
      topicHint?: string;
      examCategoryHint?: string;
    },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        createErrorResponse('FILE_REQUIRED', 'Excel or CSV file is required', newRequestId()),
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        createErrorResponse('FILE_TOO_LARGE', 'File must be 15MB or smaller', newRequestId()),
      );
    }

    const originalFilename = file.originalname || 'questions.xlsx';
    const lower = originalFilename.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
      throw new BadRequestException(
        createErrorResponse('INVALID_FILE_TYPE', 'Only .xlsx and .csv are supported', newRequestId()),
      );
    }

    const fileSha256 = hashFileBuffer(file.buffer);
    const existingFile = await this.prisma.questionUploadBatch.findFirst({
      where: {
        fileSha256,
        status: { in: [QuestionUploadStatus.VALIDATED, QuestionUploadStatus.IMPORTING, QuestionUploadStatus.COMPLETED] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, batchCode: true, displayName: true, status: true },
    });

    if (existingFile?.status === QuestionUploadStatus.COMPLETED) {
      throw new ConflictException(
        createErrorResponse(
          'DUPLICATE_FILE',
          `This exact file was already imported as batch ${existingFile.batchCode}`,
          newRequestId(),
          [{ existingBatchId: existingFile.id, existingBatchCode: existingFile.batchCode }],
        ),
      );
    }

    const displayName =
      input.displayName?.trim() ||
      originalFilename.replace(/\.(xlsx|csv)$/i, '').slice(0, 200) ||
      'Question upload';
    let batchCode = slugifyBatchCode(input.batchCode?.trim() || displayName);
    if (!batchCode) batchCode = `BATCH_${Date.now()}`;
    const codeTaken = await this.prisma.questionUploadBatch.findUnique({
      where: { batchCode },
      select: { id: true },
    });
    if (codeTaken) {
      batchCode = `${batchCode}_${randomUUID().slice(0, 8).toUpperCase()}`.slice(0, 80);
    }

    let parsed: ParsedImportRow[];
    try {
      parsed = await parseQuestionWorkbook(file.buffer, originalFilename, file.mimetype || '');
    } catch (err) {
      if (err instanceof Error && err.message === 'MISSING_HEADERS') {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_TEMPLATE',
            'Missing required headers. Download the template and try again.',
            newRequestId(),
          ),
        );
      }
      throw err;
    }

    if (parsed.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EMPTY_FILE', 'No question rows found in the file', newRequestId()),
      );
    }
    if (parsed.length > MAX_ROWS) {
      throw new BadRequestException(
        createErrorResponse(
          'TOO_MANY_ROWS',
          `Maximum ${MAX_ROWS} rows per upload`,
          newRequestId(),
        ),
      );
    }

    await this.backfillMissingContentHashes();

    const batchId = randomUUID();
    const storageDir = path.join(this.uploadRoot(), batchId);
    mkdirSync(storageDir, { recursive: true });
    const safeName = originalFilename.replace(/[^\w.\-()+\u0980-\u09FF ]+/g, '_').slice(0, 180);
    const storagePath = path.join(storageDir, safeName);
    await pipeline(Readable.from(file.buffer), createWriteStream(storagePath));

    const categoryIndex = await this.buildCategoryIndex();
    const existingHashes = await this.loadExistingHashes(
      parsed.map((r) => hashQuestionContent(r.question)),
    );

    const collectionSubject = input.subjectHint?.trim() || '';
    const collectionTopic = input.topicHint?.trim() || '';
    const collectionExam = input.examCategoryHint?.trim() || '';

    const rowCreates: Prisma.QuestionImportRowCreateManyInput[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    const seenInFile = new Map<string, number>();

    for (const row of parsed) {
      const subjectName = row.subject || collectionSubject;
      const topicName = row.topic || collectionTopic;
      const examCategory = row.examCategory || collectionExam;

      const hash = row.question ? hashQuestionContent(row.question) : null;
      const errors: string[] = [];

      if (!row.question) errors.push('Question is required');
      if (!row.optionA || !row.optionB || !row.optionC || !row.optionD) {
        errors.push('Options A–D are required');
      }
      const correct = row.correctAnswer.trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(correct)) {
        errors.push('Correct Answer must be A, B, C, or D');
      }
      const difficulty = parseDifficulty(row.difficulty);
      if (!difficulty) errors.push('Difficulty must be Easy, Medium, or Hard');
      if (!subjectName) errors.push('Subject is required');
      if (!topicName) errors.push('Topic is required');

      const subject = subjectName
        ? categoryIndex.rootsByName.get(this.nameKey(subjectName))
        : null;
      if (subjectName && !subject) {
        errors.push(`Subject not found: ${subjectName}`);
      }
      let topicId: string | undefined;
      if (subject && topicName) {
        topicId = categoryIndex.topicsByParentAndName.get(
          `${subject.id}::${this.nameKey(topicName)}`,
        );
        // Topic may be created on import if subject exists — allow VALID without topic id.
      }

      if (errors.length) {
        invalidCount += 1;
        rowCreates.push({
          id: randomUUID(),
          batchId,
          rowNumber: row.rowNumber,
          status: QuestionImportRowStatus.INVALID,
          contentHash: hash,
          questionText: row.question || '(empty)',
          optionA: row.optionA || null,
          optionB: row.optionB || null,
          optionC: row.optionC || null,
          optionD: row.optionD || null,
          correctAnswer: correct?.[0] || null,
          explanation: row.explanation || null,
          subjectName: subjectName || null,
          topicName: topicName || null,
          difficulty: row.difficulty || null,
          examCategory: examCategory || null,
          examYear: row.examYear || null,
          source: row.source || null,
          errorMessage: errors.join('; ').slice(0, 500),
        });
        continue;
      }

      const priorInFile = hash ? seenInFile.get(hash) : undefined;
      if (hash && priorInFile) {
        duplicateCount += 1;
        rowCreates.push({
          id: randomUUID(),
          batchId,
          rowNumber: row.rowNumber,
          status: QuestionImportRowStatus.DUPLICATE,
          contentHash: hash,
          questionText: row.question,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctAnswer: correct,
          explanation: row.explanation || null,
          subjectName,
          topicName,
          difficulty: difficulty!,
          examCategory: examCategory || null,
          examYear: row.examYear || null,
          source: row.source || null,
          errorMessage: `Duplicate of row ${priorInFile} in this file`,
        });
        continue;
      }

      const existing = hash ? existingHashes.get(hash) : undefined;
      if (existing) {
        duplicateCount += 1;
        rowCreates.push({
          id: randomUUID(),
          batchId,
          rowNumber: row.rowNumber,
          status: QuestionImportRowStatus.DUPLICATE,
          contentHash: hash,
          questionText: row.question,
          optionA: row.optionA,
          optionB: row.optionB,
          optionC: row.optionC,
          optionD: row.optionD,
          correctAnswer: correct,
          explanation: row.explanation || null,
          subjectName,
          topicName,
          difficulty: difficulty!,
          examCategory: examCategory || null,
          examYear: row.examYear || null,
          source: row.source || null,
          existingQuestionId: existing.id,
          errorMessage: `Duplicate of existing question (${existing.title.slice(0, 80)})`,
        });
        continue;
      }

      if (hash) seenInFile.set(hash, row.rowNumber);
      validCount += 1;
      rowCreates.push({
        id: randomUUID(),
        batchId,
        rowNumber: row.rowNumber,
        status: QuestionImportRowStatus.VALID,
        contentHash: hash,
        questionText: row.question,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctAnswer: correct,
        explanation: row.explanation || null,
        subjectName,
        topicName,
        difficulty: difficulty!,
        examCategory: examCategory || null,
        examYear: row.examYear || null,
        source: row.source || null,
      });
      void topicId;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.questionUploadBatch.create({
        data: {
          id: batchId,
          batchCode,
          displayName,
          description: input.description?.trim() || null,
          originalFilename,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSha256,
          storagePath,
          status: QuestionUploadStatus.VALIDATED,
          totalRows: parsed.length,
          validCount,
          invalidCount,
          duplicateCount,
          subjectHint: collectionSubject || null,
          topicHint: collectionTopic || null,
          examCategoryHint: collectionExam || null,
          duplicateFileBatchId: existingFile?.id ?? null,
          uploadedById: user.userId,
        },
      });
      // chunk createMany
      const chunkSize = 500;
      for (let i = 0; i < rowCreates.length; i += chunkSize) {
        await tx.questionImportRow.createMany({ data: rowCreates.slice(i, i + chunkSize) });
      }
    });

    return this.getBatch(batchId);
  }

  async confirmImport(user: RequestUser, batchId: string, opts: { skipDuplicates?: boolean }) {
    const batch = await this.getBatch(batchId);
    if (
      batch.status !== QuestionUploadStatus.VALIDATED &&
      batch.status !== QuestionUploadStatus.FAILED
    ) {
      throw new BadRequestException(
        createErrorResponse(
          'BATCH_NOT_IMPORTABLE',
          `Batch status ${batch.status} cannot be imported`,
          newRequestId(),
        ),
      );
    }

    await this.prisma.questionUploadBatch.update({
      where: { id: batchId },
      data: { status: QuestionUploadStatus.IMPORTING, errorMessage: null },
    });

    try {
      const result = await this.runImport(user, batchId, opts.skipDuplicates !== false);
      return result;
    } catch (err) {
      await this.prisma.questionUploadBatch.update({
        where: { id: batchId },
        data: {
          status: QuestionUploadStatus.FAILED,
          errorMessage: err instanceof Error ? err.message.slice(0, 500) : 'Import failed',
        },
      });
      throw err;
    }
  }

  private async runImport(user: RequestUser, batchId: string, skipDuplicates: boolean) {
    const categoryIndex = await this.buildCategoryIndex();
    const rows = await this.prisma.questionImportRow.findMany({
      where: {
        batchId,
        status: {
          in: skipDuplicates
            ? [QuestionImportRowStatus.VALID]
            : [QuestionImportRowStatus.VALID, QuestionImportRowStatus.DUPLICATE],
        },
      },
      orderBy: { rowNumber: 'asc' },
    });

    // Mark duplicates as skipped when skipping
    if (skipDuplicates) {
      await this.prisma.questionImportRow.updateMany({
        where: { batchId, status: QuestionImportRowStatus.DUPLICATE },
        data: { status: QuestionImportRowStatus.SKIPPED },
      });
    }

    let importedCount = 0;
    let failedCount = 0;
    const chunkSize = 25;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await this.prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          if (row.status === QuestionImportRowStatus.DUPLICATE && skipDuplicates) continue;
          try {
            if (!row.contentHash) throw new Error('Missing content hash');
            const subject = categoryIndex.rootsByName.get(this.nameKey(row.subjectName ?? ''));
            if (!subject) throw new Error(`Subject not found: ${row.subjectName}`);

            let topicId = categoryIndex.topicsByParentAndName.get(
              `${subject.id}::${this.nameKey(row.topicName ?? '')}`,
            );
            if (!topicId && row.topicName) {
              const slugBase = slugifyBatchCode(row.topicName).toLowerCase().replace(/_/g, '-') || 'topic';
              const slug = `${subject.slug}-${slugBase}`.slice(0, 100);
              const createdTopic = await tx.category.create({
                data: {
                  name: row.topicName.slice(0, 100),
                  slug: `${slug}-${randomUUID().slice(0, 6)}`,
                  parentId: subject.id,
                  isActive: true,
                  sortOrder: 99,
                },
              });
              topicId = createdTopic.id;
              categoryIndex.topicsByParentAndName.set(
                `${subject.id}::${this.nameKey(row.topicName)}`,
                topicId,
              );
            }

            const difficulty = (parseDifficulty(row.difficulty) ?? 'MEDIUM') as Difficulty;
            const examTag = mapExamCategoryToTag(row.examCategory);
            const sourceParts = [
              row.source?.trim(),
              row.examYear?.trim() ? `Year ${row.examYear.trim()}` : null,
              `Batch ${batchId.slice(0, 8)}`,
            ].filter(Boolean);

            const options = [
              { label: 'A', content: row.optionA!, isCorrect: row.correctAnswer === 'A' },
              { label: 'B', content: row.optionB!, isCorrect: row.correctAnswer === 'B' },
              { label: 'C', content: row.optionC!, isCorrect: row.correctAnswer === 'C' },
              { label: 'D', content: row.optionD!, isCorrect: row.correctAnswer === 'D' },
            ];

            const title = row.questionText.slice(0, 200);
            const created = await tx.question.create({
              data: {
                title,
                content: row.questionText,
                explanation: row.explanation,
                categoryId: subject.id,
                subcategoryId: topicId,
                difficulty,
                status: QuestionStatus.PUBLISHED,
                publishedAt: new Date(),
                examTags: examTag ? [examTag] : [],
                sourceNote: sourceParts.join(' · ').slice(0, 240),
                contentHash: row.contentHash,
                uploadBatchId: batchId,
                createdById: user.userId,
                options: {
                  create: options.map((o, index) => ({
                    label: o.label,
                    content: o.content,
                    isCorrect: o.isCorrect,
                    sortOrder: index,
                  })),
                },
              },
              select: { id: true },
            });

            await tx.questionImportRow.update({
              where: { id: row.id },
              data: {
                status: QuestionImportRowStatus.IMPORTED,
                createdQuestionId: created.id,
                errorMessage: null,
              },
            });
            importedCount += 1;
          } catch (err) {
            failedCount += 1;
            const message =
              err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
                ? 'Duplicate content hash — question already exists'
                : err instanceof Error
                  ? err.message.slice(0, 500)
                  : 'Import failed';
            await tx.questionImportRow.update({
              where: { id: row.id },
              data: {
                status: QuestionImportRowStatus.INVALID,
                errorMessage: message,
              },
            });
          }
        }
      });
    }

    const skippedCount = await this.prisma.questionImportRow.count({
      where: { batchId, status: QuestionImportRowStatus.SKIPPED },
    });
    const invalidCount = await this.prisma.questionImportRow.count({
      where: { batchId, status: QuestionImportRowStatus.INVALID },
    });
    const duplicateCount = await this.prisma.questionImportRow.count({
      where: { batchId, status: QuestionImportRowStatus.DUPLICATE },
    });

    return this.prisma.questionUploadBatch.update({
      where: { id: batchId },
      data: {
        status: QuestionUploadStatus.COMPLETED,
        importedCount,
        failedCount,
        skippedCount,
        invalidCount,
        duplicateCount,
        importedAt: new Date(),
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  async archiveBatch(id: string) {
    await this.getBatch(id);
    return this.prisma.questionUploadBatch.update({
      where: { id },
      data: { status: QuestionUploadStatus.ARCHIVED, archivedAt: new Date() },
    });
  }

  async deleteBatch(id: string) {
    const batch = await this.getBatch(id);
    if (batch.status === QuestionUploadStatus.COMPLETED) {
      throw new BadRequestException(
        createErrorResponse(
          'BATCH_HAS_IMPORTS',
          'Completed batches cannot be deleted. Archive instead — questions remain in the bank.',
          newRequestId(),
        ),
      );
    }
    if (batch.status === QuestionUploadStatus.IMPORTING) {
      throw new BadRequestException(
        createErrorResponse('BATCH_BUSY', 'Import in progress', newRequestId()),
      );
    }
    await this.prisma.questionUploadBatch.delete({ where: { id } });
    if (batch.storagePath && existsSync(batch.storagePath)) {
      await fs.unlink(batch.storagePath).catch(() => undefined);
    }
    return { deleted: true };
  }

  async readOriginalFile(id: string) {
    const batch = await this.getBatch(id);
    if (!existsSync(batch.storagePath)) {
      throw new NotFoundException(
        createErrorResponse('FILE_MISSING', 'Original file is no longer on disk', newRequestId()),
      );
    }
    const buffer = await fs.readFile(batch.storagePath);
    return {
      buffer,
      filename: batch.originalFilename,
      mimeType: batch.mimeType,
    };
  }

  async buildReport(id: string) {
    await this.getBatch(id);
    const rows = await this.prisma.questionImportRow.findMany({
      where: { batchId: id },
      orderBy: { rowNumber: 'asc' },
      select: {
        rowNumber: true,
        status: true,
        questionText: true,
        errorMessage: true,
        subjectName: true,
        topicName: true,
        examCategory: true,
      },
    });
    return buildImportReportBuffer(rows);
  }

  async exportBatchQuestions(id: string) {
    const batch = await this.getBatch(id);
    const questions = await this.prisma.question.findMany({
      where: { uploadBatchId: id, deletedAt: null },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Questions');
    sheet.addRow([
      'Question',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Correct Answer',
      'Explanation',
      'Subject',
      'Topic',
      'Difficulty',
      'Exam Category',
      'Exam Year',
      'Source',
    ]);
    for (const q of questions) {
      const byLabel = Object.fromEntries(q.options.map((o) => [o.label, o]));
      const correct = q.options.find((o) => o.isCorrect)?.label ?? '';
      sheet.addRow([
        q.content,
        byLabel.A?.content ?? '',
        byLabel.B?.content ?? '',
        byLabel.C?.content ?? '',
        byLabel.D?.content ?? '',
        correct,
        q.explanation ?? '',
        q.category.name,
        q.subcategory?.name ?? '',
        q.difficulty,
        q.examTags[0] ?? '',
        '',
        q.sourceNote ?? '',
      ]);
    }
    const buf = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buf),
      filename: `${batch.batchCode}_export.xlsx`,
    };
  }

  private nameKey(name: string): string {
    return name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private async buildCategoryIndex() {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: { children: { where: { isActive: true } } },
    });
    const rootsByName = new Map<string, { id: string; slug: string; name: string }>();
    const topicsByParentAndName = new Map<string, string>();
    for (const root of roots) {
      rootsByName.set(this.nameKey(root.name), { id: root.id, slug: root.slug, name: root.name });
      for (const child of root.children) {
        topicsByParentAndName.set(`${root.id}::${this.nameKey(child.name)}`, child.id);
      }
    }
    return { rootsByName, topicsByParentAndName };
  }

  private async loadExistingHashes(hashes: string[]) {
    const unique = [...new Set(hashes.filter(Boolean))];
    const map = new Map<string, { id: string; title: string }>();
    const chunkSize = 500;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const slice = unique.slice(i, i + chunkSize);
      const found = await this.prisma.question.findMany({
        where: { deletedAt: null, contentHash: { in: slice } },
        select: { id: true, title: true, contentHash: true },
      });
      for (const q of found) {
        if (q.contentHash) map.set(q.contentHash, { id: q.id, title: q.title });
      }
    }
    return map;
  }

  private async backfillMissingContentHashes() {
    const missing = await this.prisma.question.findMany({
      where: { deletedAt: null, contentHash: null },
      select: { id: true, content: true },
      take: 2000,
    });
    for (const q of missing) {
      try {
        await this.prisma.question.update({
          where: { id: q.id },
          data: { contentHash: hashQuestionContent(q.content) },
        });
      } catch {
        // Skip collisions from legacy near-duplicates; import still hashes new rows.
      }
    }
  }
}
