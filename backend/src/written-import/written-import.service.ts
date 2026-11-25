import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryScope,
  Prisma,
  QuestionImportRowStatus,
  QuestionStatus,
  QuestionUploadStatus,
} from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { accessSync, constants, createWriteStream, existsSync, mkdirSync, promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { mapExamCategoryToTag } from '../question-import/exam-tag-map';
import {
  examYearFromDate,
  parseQuestionDate,
  toIsoDateString,
} from '../question-import/question-date.util';
import { toAsciiDigits } from '../question-import/excel-parser';
import { hashFileBuffer, slugifyBatchCode } from '../question-import/question-normalize';
import {
  buildWrittenImportReportBuffer,
  buildWrittenTemplateBuffer,
  hashWrittenIdentity,
  parseMarks,
  parseWrittenWorkbook,
  WRITTEN_TEMPLATE_HEADERS,
} from './excel-parser';
import { buildWrittenDocxTemplateBuffer } from './docx-template';
import {
  buildWrittenCategoryIndex,
  nameKey,
  resolveWrittenRoot,
  resolveWrittenTopicId,
  type WrittenCategoryIndex,
  type WrittenRootCategory,
} from './written-taxonomy';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_PLACEMENT_SUBCATEGORIES = 8;

@Injectable()
export class WrittenImportService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadRoot(): string {
    const root =
      process.env.WRITTEN_QUESTION_IMPORT_DIR?.trim() ||
      path.join(process.cwd(), 'storage', 'written-question-imports');
    try {
      if (!existsSync(root)) mkdirSync(root, { recursive: true });
      accessSync(root, constants.W_OK);
    } catch {
      throw new InternalServerErrorException(
        createErrorResponse(
          'STORAGE_UNAVAILABLE',
          'Cannot save the upload on the server (storage folder is missing or not writable).',
          newRequestId(),
        ),
      );
    }
    return root;
  }

  async getTemplateBuffer(format: 'xlsx' | 'docx' = 'xlsx'): Promise<Buffer> {
    if (format === 'docx') return buildWrittenDocxTemplateBuffer();
    return buildWrittenTemplateBuffer();
  }

  async getStats() {
    const [totalCollections, aggregates, recentUploads] = await Promise.all([
      this.prisma.writtenUploadBatch.count(),
      this.prisma.writtenUploadBatch.aggregate({
        _sum: {
          importedCount: true,
          duplicateCount: true,
          invalidCount: true,
          failedCount: true,
          skippedCount: true,
          totalRows: true,
        },
      }),
      this.prisma.writtenUploadBatch.findMany({
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
    const orderBy: Prisma.WrittenUploadBatchOrderByWithRelationInput[] = (() => {
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

    const items = await this.prisma.writtenUploadBatch.findMany({
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
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return { items, nextCursor };
  }

  async getBatch(id: string) {
    const batch = await this.prisma.writtenUploadBatch.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        placements: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            categoryId: true,
            subcategoryId: true,
            sortOrder: true,
            subcategory: { select: { id: true, name: true, slug: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Upload batch not found', newRequestId()),
      );
    }
    let duplicateFileBatch: { id: string; batchCode: string; displayName: string } | null = null;
    if (batch.duplicateFileBatchId) {
      duplicateFileBatch = await this.prisma.writtenUploadBatch.findUnique({
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
    const items = await this.prisma.writtenImportRow.findMany({
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

  async updateBatch(
    id: string,
    dto: {
      displayName?: string;
      description?: string | null;
      subjectHint?: string | null;
      topicHint?: string | null;
      examCategoryHint?: string | null;
      questionDate?: string | null;
      placementSubcategoryIds?: string[] | null;
    },
  ) {
    const batch = await this.getBatch(id);
    let questionDate: Date | null | undefined;
    let examYear: string | null | undefined;
    if (dto.questionDate !== undefined) {
      if (dto.questionDate == null || dto.questionDate === '') {
        questionDate = null;
        examYear = null;
      } else {
        const parsed = parseQuestionDate(dto.questionDate);
        if (!parsed) {
          throw new BadRequestException(
            createErrorResponse(
              'INVALID_QUESTION_DATE',
              'questionDate must be a valid date (YYYY-MM-DD)',
              newRequestId(),
            ),
          );
        }
        questionDate = parsed.date;
        examYear = parsed.examYear;
      }
    }

    const taxonomyChanging =
      dto.subjectHint !== undefined ||
      dto.topicHint !== undefined ||
      dto.placementSubcategoryIds !== undefined;

    if (taxonomyChanging) {
      if (
        batch.status !== QuestionUploadStatus.VALIDATED &&
        batch.status !== QuestionUploadStatus.FAILED
      ) {
        throw new BadRequestException(
          createErrorResponse(
            'BATCH_NOT_EDITABLE',
            'Category / subcategory can only be changed before import is confirmed',
            newRequestId(),
          ),
        );
      }

      const nextSubject =
        dto.subjectHint !== undefined
          ? dto.subjectHint?.trim().slice(0, 120) || ''
          : batch.subjectHint?.trim() || '';
      const nextTopic =
        dto.topicHint !== undefined
          ? dto.topicHint?.trim().slice(0, 120) || ''
          : batch.topicHint?.trim() || '';
      const nextPlacementIds =
        dto.placementSubcategoryIds !== undefined
          ? (dto.placementSubcategoryIds ?? []).map((x) => String(x).trim()).filter(Boolean)
          : undefined;

      const resolved = await this.resolveCollectionTaxonomy({
        subjectHint: nextSubject,
        topicHint: nextTopic,
        placementSubcategoryIds: nextPlacementIds,
        requireCategory: true,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.writtenUploadBatchPlacement.deleteMany({ where: { batchId: id } });
        if (resolved.placementRows.length) {
          await tx.writtenUploadBatchPlacement.createMany({
            data: resolved.placementRows.map((p) => ({
              id: randomUUID(),
              batchId: id,
              categoryId: p.categoryId,
              subcategoryId: p.subcategoryId,
              sortOrder: p.sortOrder,
            })),
          });
        }
        await tx.writtenUploadBatch.update({
          where: { id },
          data: {
            ...(dto.displayName !== undefined
              ? { displayName: dto.displayName.trim().slice(0, 200) }
              : {}),
            ...(dto.description !== undefined
              ? { description: dto.description?.trim() || null }
              : {}),
            subjectHint: resolved.root.name.slice(0, 120),
            topicHint: resolved.primaryTopicName?.slice(0, 120) ?? null,
            ...(dto.examCategoryHint !== undefined
              ? { examCategoryHint: dto.examCategoryHint?.trim().slice(0, 120) || null }
              : {}),
            ...(questionDate !== undefined ? { questionDate, examYear: examYear ?? null } : {}),
          },
        });
        // Rewrite row taxonomy so confirmImport assigns the edited subcategory.
        await tx.writtenImportRow.updateMany({
          where: {
            batchId: id,
            status: {
              in: [
                QuestionImportRowStatus.VALID,
                QuestionImportRowStatus.DUPLICATE,
                QuestionImportRowStatus.INVALID,
              ],
            },
          },
          data: {
            subjectName: resolved.root.name.slice(0, 120),
            topicName: resolved.primaryTopicName?.slice(0, 120) ?? null,
          },
        });
      });

      return this.getBatch(id);
    }

    return this.prisma.writtenUploadBatch.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName.trim().slice(0, 200) }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.examCategoryHint !== undefined
          ? { examCategoryHint: dto.examCategoryHint?.trim().slice(0, 120) || null }
          : {}),
        ...(questionDate !== undefined ? { questionDate, examYear: examYear ?? null } : {}),
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  async updateImportRow(batchId: string, rowId: string, dto: { questionDate?: string | null }) {
    const batch = await this.getBatch(batchId);
    if (
      batch.status !== QuestionUploadStatus.VALIDATED &&
      batch.status !== QuestionUploadStatus.FAILED
    ) {
      throw new BadRequestException(
        createErrorResponse(
          'BATCH_NOT_EDITABLE',
          'Only validated batches can have rows edited',
          newRequestId(),
        ),
      );
    }
    const row = await this.prisma.writtenImportRow.findFirst({
      where: { id: rowId, batchId },
    });
    if (!row) {
      throw new NotFoundException(
        createErrorResponse('IMPORT_ROW_NOT_FOUND', 'Import row not found', newRequestId()),
      );
    }
    let questionDate: Date | null = row.questionDate;
    let examYear: string | null = row.examYear;
    if (dto.questionDate !== undefined) {
      if (dto.questionDate == null || dto.questionDate === '') {
        questionDate = null;
        examYear = null;
      } else {
        const parsed = parseQuestionDate(dto.questionDate);
        if (!parsed) {
          throw new BadRequestException(
            createErrorResponse(
              'INVALID_QUESTION_DATE',
              'questionDate must be a valid date (YYYY-MM-DD)',
              newRequestId(),
            ),
          );
        }
        questionDate = parsed.date;
        examYear = parsed.examYear;
      }
    }
    return this.prisma.writtenImportRow.update({
      where: { id: rowId },
      data: { questionDate, examYear },
    });
  }

  private async buildCategoryIndex(): Promise<WrittenCategoryIndex> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, scope: CategoryScope.WRITTEN },
      select: { id: true, name: true, slug: true, parentId: true },
    });
    return buildWrittenCategoryIndex(categories);
  }

  /**
   * Resolve Written root + placements from form hints / UUIDs.
   * Fails closed on unknown category, unmatched topic names, or cross-parent IDs.
   */
  private async resolveCollectionTaxonomy(input: {
    subjectHint: string;
    topicHint?: string;
    placementSubcategoryIds?: string[];
    requireCategory: boolean;
  }): Promise<{
    root: WrittenRootCategory;
    primaryTopicName: string | null;
    placementRows: Array<{
      categoryId: string;
      subcategoryId: string;
      sortOrder: number;
      name: string;
    }>;
    index: WrittenCategoryIndex;
  }> {
    const index = await this.buildCategoryIndex();
    const subjectHint = input.subjectHint.trim();
    if (!subjectHint) {
      if (input.requireCategory || (input.placementSubcategoryIds?.length ?? 0) > 0) {
        throw new BadRequestException(
          createErrorResponse(
            'CATEGORY_REQUIRED',
            'Select a Written category before assigning subcategories',
            newRequestId(),
          ),
        );
      }
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_REQUIRED',
          'Category is required for this collection',
          newRequestId(),
        ),
      );
    }

    const root = resolveWrittenRoot(index, subjectHint);
    if (!root) {
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_NOT_FOUND',
          `Written category not found: ${subjectHint}`,
          newRequestId(),
        ),
      );
    }

    const placementIdSet: string[] = [];
    const pushPlacementId = (id: string | undefined | null) => {
      if (!id || placementIdSet.includes(id)) return;
      if (placementIdSet.length >= MAX_PLACEMENT_SUBCATEGORIES) return;
      placementIdSet.push(id);
    };

    const topicHint = input.topicHint?.trim() || '';
    if (topicHint) {
      const fromHint = resolveWrittenTopicId(index, root.id, topicHint);
      if (!fromHint) {
        throw new BadRequestException(
          createErrorResponse(
            'SUBCATEGORY_NOT_FOUND',
            `Written subcategory "${topicHint}" was not found under category "${root.name}"`,
            newRequestId(),
          ),
        );
      }
      pushPlacementId(fromHint);
    }

    for (const rawId of input.placementSubcategoryIds ?? []) {
      pushPlacementId(rawId?.trim());
    }

    const placementRows: Array<{
      categoryId: string;
      subcategoryId: string;
      sortOrder: number;
      name: string;
    }> = [];

    for (let i = 0; i < placementIdSet.length; i += 1) {
      const sub = await this.prisma.category.findFirst({
        where: {
          id: placementIdSet[i],
          parentId: root.id,
          isActive: true,
          scope: CategoryScope.WRITTEN,
        },
        select: { id: true, name: true },
      });
      if (!sub) {
        throw new BadRequestException(
          createErrorResponse(
            'SUBCATEGORY_INVALID',
            'Each placement must be an active Written-bank subcategory of the selected Written category',
            newRequestId(),
          ),
        );
      }
      placementRows.push({
        categoryId: root.id,
        subcategoryId: sub.id,
        sortOrder: i,
        name: sub.name,
      });
    }

    return {
      root,
      primaryTopicName: placementRows[0]?.name ?? (topicHint || null),
      placementRows,
      index,
    };
  }

  private extractYearHint(text: string | null | undefined): string | null {
    if (!text?.trim()) return null;
    return text.match(/(?:19|20)\d{2}/)?.[0] ?? null;
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
      placementSubcategoryIds?: string[];
      questionDate?: string;
    },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        createErrorResponse('FILE_REQUIRED', 'Excel, CSV, or Word file is required', newRequestId()),
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        createErrorResponse('FILE_TOO_LARGE', 'File must be 15MB or smaller', newRequestId()),
      );
    }

    const originalFilename = file.originalname || 'written-questions.xlsx';
    const lower = originalFilename.toLowerCase();
    if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
      throw new BadRequestException(
        createErrorResponse(
          'LEGACY_DOC_NOT_SUPPORTED',
          'Legacy .doc (Word 97–2003) is not supported. Open the file in Word or Google Docs and Save/Download as .docx, then upload again.',
          newRequestId(),
        ),
      );
    }
    if (
      !lower.endsWith('.xlsx') &&
      !lower.endsWith('.xls') &&
      !lower.endsWith('.csv') &&
      !lower.endsWith('.docx')
    ) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_FILE_TYPE',
          'Only .xlsx, .csv, and .docx are supported (legacy .doc / .xls are not)',
          newRequestId(),
        ),
      );
    }
    if (lower.endsWith('.xls') && !lower.endsWith('.xlsx')) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_FILE_TYPE',
          'Legacy .xls is not supported — save as .xlsx or .csv',
          newRequestId(),
        ),
      );
    }

    const fileSha256 = hashFileBuffer(file.buffer);
    const existingFile = await this.prisma.writtenUploadBatch.findFirst({
      where: {
        fileSha256,
        status: {
          in: [
            QuestionUploadStatus.VALIDATED,
            QuestionUploadStatus.IMPORTING,
            QuestionUploadStatus.COMPLETED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, batchCode: true, displayName: true, status: true },
    });

    // displayName finalized after parse when examMeta can enrich the title
    let displayName =
      input.displayName?.trim() ||
      originalFilename.replace(/\.(xlsx|xls|csv|docx)$/i, '').slice(0, 200) ||
      'Written upload';
    let batchCode = slugifyBatchCode(input.batchCode?.trim() || displayName);
    if (!batchCode) batchCode = `WRITTEN_${Date.now()}`;
    const codeTaken = await this.prisma.writtenUploadBatch.findUnique({
      where: { batchCode },
      select: { id: true },
    });
    if (codeTaken) {
      batchCode = `${batchCode}_${randomUUID().slice(0, 8).toUpperCase()}`.slice(0, 80);
    }

    let workbook;
    try {
      workbook = await parseWrittenWorkbook(file.buffer, originalFilename, file.mimetype || '');
    } catch (err) {
      if (err instanceof Error && err.message === 'LEGACY_DOC_NOT_SUPPORTED') {
        throw new BadRequestException(
          createErrorResponse(
            'LEGACY_DOC_NOT_SUPPORTED',
            'Legacy .doc is not supported. Convert to .docx (Word: File → Save As → Word Document; Google Docs: Download → Microsoft Word).',
            newRequestId(),
          ),
        );
      }
      if (err instanceof Error && err.message === 'INVALID_DOCX') {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_DOCX',
            'Could not read this Word file. Use a valid .docx (OOXML) export — not a renamed .doc or corrupt zip.',
            newRequestId(),
          ),
        );
      }
      if (err instanceof Error && err.message === 'MISSING_HEADERS') {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_TEMPLATE',
            `Could not find written questions. Supported .docx layouts: (1) Excel-style Word table with ${WRITTEN_TEMPLATE_HEADERS.join(' | ')}; (2) real exam paper with header + numbered prompts like ০১। / 1. and optional ক)–ঙ) / a)–e) sub-lines; (3) labeled blocks (প্রশ্ন নং / প্রশ্ন / নম্বর / মডেল উত্তর).`,
            newRequestId(),
          ),
        );
      }
      throw err;
    }

    const parsed = workbook.rows;
    const examMeta = workbook.examMeta;
    const sheetPreamble =
      (examMeta?.rawHeader || workbook.preamble).slice(0, 4000) || null;
    if (!parsed.length) {
      throw new BadRequestException(
        createErrorResponse('EMPTY_FILE', 'No question rows found in the file', newRequestId()),
      );
    }
    if (parsed.length > MAX_ROWS) {
      throw new BadRequestException(
        createErrorResponse('TOO_MANY_ROWS', `Maximum ${MAX_ROWS} rows per upload`, newRequestId()),
      );
    }

    if (!input.displayName?.trim() && examMeta?.examTitle) {
      displayName = [examMeta.examTitle, examMeta.postName].filter(Boolean).join(' — ').slice(0, 200);
    }

    const batchId = randomUUID();
    const storageDir = path.join(this.uploadRoot(), batchId);
    mkdirSync(storageDir, { recursive: true });
    const safeName = originalFilename.replace(/[^\w.\-()+\u0980-\u09FF ]+/g, '_').slice(0, 180);
    const storagePath = path.join(storageDir, safeName);
    await pipeline(Readable.from(file.buffer), createWriteStream(storagePath));

    const collectionSubject = input.subjectHint?.trim() || '';
    const collectionTopic = input.topicHint?.trim() || '';
    const collectionExam =
      input.examCategoryHint?.trim() ||
      [examMeta?.examTitle, examMeta?.postName].filter(Boolean).join(' — ').slice(0, 120) ||
      '';
    const sheetHasCategory = parsed.some((row) => Boolean(row.subject?.trim()));
    const placementIds = (input.placementSubcategoryIds ?? [])
      .map((id) => id?.trim())
      .filter((id): id is string => Boolean(id));

    if (!collectionSubject && !sheetHasCategory) {
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_REQUIRED',
          'Category is required for this collection',
          newRequestId(),
        ),
      );
    }
    if (!collectionSubject && (placementIds.length > 0 || collectionTopic)) {
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_REQUIRED',
          'Select a Written category before assigning subcategories',
          newRequestId(),
        ),
      );
    }

    let categoryIndex = await this.buildCategoryIndex();
    let rootCategory: WrittenRootCategory | null = null;
    let placementRows: Array<{
      categoryId: string;
      subcategoryId: string;
      sortOrder: number;
      name: string;
    }> = [];
    let resolvedTopicHint = '';

    if (collectionSubject) {
      const resolved = await this.resolveCollectionTaxonomy({
        subjectHint: collectionSubject,
        topicHint: collectionTopic,
        placementSubcategoryIds: placementIds,
        requireCategory: true,
      });
      categoryIndex = resolved.index;
      rootCategory = resolved.root;
      placementRows = resolved.placementRows;
      resolvedTopicHint = resolved.primaryTopicName ?? '';
    }
    const filenameDate = (() => {
      const m = toAsciiDigits(originalFilename).match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
      if (!m) return null;
      return parseQuestionDate(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
    })();
    const defaultQuestionDate =
      parseQuestionDate(input.questionDate ?? null) ??
      (examMeta?.examDate ? parseQuestionDate(examMeta.examDate) : null) ??
      filenameDate;
    const yearCounts = new Map<string, number>();
    for (const row of parsed) {
      const y = row.examYear?.trim() || parseQuestionDate(row.questionDate)?.examYear;
      if (!y) continue;
      yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
    }
    const batchExamYear =
      defaultQuestionDate?.examYear ??
      [...yearCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      this.extractYearHint(displayName) ??
      this.extractYearHint(sheetPreamble ?? '') ??
      null;

    let batchQuestionDate: Date | null = defaultQuestionDate?.date ?? null;
    const rowCreates: Prisma.WrittenImportRowCreateManyInput[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const row of parsed) {
      const subjectName = row.subject?.trim() || collectionSubject;
      // Prefer explicit sheet topic; otherwise use primary placement / form topic.
      const topicName = row.topic?.trim() || resolvedTopicHint;
      const examCategory = row.examCategory || collectionExam;
      const errors: string[] = [];

      if (!row.question?.trim()) errors.push('Column "প্রশ্ন": question text is required');
      if (!subjectName) {
        errors.push(
          'Category is required — set it in the upload form or add a Subject/বিষয় column',
        );
      }
      const subject = resolveWrittenRoot(categoryIndex, subjectName);
      if (subjectName && !subject) {
        errors.push(`Written category not found: ${subjectName}`);
      }
      // When the form selected placements, every row topic must resolve under that parent.
      // Sheet-only unknown topics (no placements) may auto-create on confirm.
      if (subject && topicName && placementRows.length > 0) {
        const topicId = resolveWrittenTopicId(categoryIndex, subject.id, topicName);
        if (!topicId) {
          errors.push(
            `Written subcategory "${topicName}" was not found under category "${subject.name}"`,
          );
        }
      }

      const marksValue = row.marks?.trim() ? parseMarks(row.marks) : null;
      if (row.marks?.trim() && marksValue == null) {
        errors.push(`Column "নম্বর": invalid marks "${row.marks}"`);
      }

      let rowQuestionDate: Date | null = null;
      let rowExamYear: string | null = row.examYear?.trim() || null;
      if (row.questionDate?.trim()) {
        const parsedDate = parseQuestionDate(row.questionDate);
        if (!parsedDate) {
          errors.push(
            `Column "প্রশ্নের তারিখ": invalid date "${row.questionDate}" (use YYYY-MM-DD)`,
          );
        } else {
          rowQuestionDate = parsedDate.date;
          rowExamYear = parsedDate.examYear;
        }
      } else if (rowExamYear) {
        const fromYear = parseQuestionDate(rowExamYear);
        if (fromYear) {
          rowQuestionDate = fromYear.date;
          rowExamYear = fromYear.examYear;
        }
      } else if (defaultQuestionDate) {
        rowQuestionDate = defaultQuestionDate.date;
        rowExamYear = defaultQuestionDate.examYear;
      } else {
        errors.push(
          'Question date is required — add "প্রশ্নের তারিখ" in Excel or set a default date in the upload form',
        );
      }

      if (
        rowQuestionDate &&
        (!batchQuestionDate || rowQuestionDate.getTime() > batchQuestionDate.getTime())
      ) {
        batchQuestionDate = rowQuestionDate;
      }

      const hash = hashWrittenIdentity(row.question ?? '', row.modelAnswer ?? '');
      const serial = row.serial?.trim().slice(0, 32) || null;
      const sectionTitle = row.sectionTitle?.trim().slice(0, 500) || null;
      const questionText = row.question ?? '';
      const modelAnswer = row.modelAnswer?.trim() || null;

      if (errors.length) {
        invalidCount += 1;
        rowCreates.push({
          id: randomUUID(),
          batchId,
          rowNumber: row.rowNumber,
          status: QuestionImportRowStatus.INVALID,
          contentHash: hash,
          serial,
          questionText,
          modelAnswer,
          marks: marksValue,
          subjectName: subjectName || null,
          topicName: topicName || null,
          examCategory: examCategory || null,
          examYear: rowExamYear,
          questionDate: rowQuestionDate,
          source: row.source || null,
          sectionTitle,
          errorMessage: `Row ${row.rowNumber}: ${errors.join('; ')}`.slice(0, 500),
        });
        continue;
      }

      validCount += 1;
      rowCreates.push({
        id: randomUUID(),
        batchId,
        rowNumber: row.rowNumber,
        status: QuestionImportRowStatus.VALID,
        contentHash: hash,
        serial,
        questionText,
        modelAnswer,
        marks: marksValue,
        subjectName,
        topicName,
        examCategory: examCategory || null,
        examYear: rowExamYear,
        questionDate: rowQuestionDate,
        source: row.source || null,
        sectionTitle,
      });
    }

    const autoDescription = examMeta
      ? [
          examMeta.duration ? `সময়: ${examMeta.duration}` : null,
          examMeta.examDate ? `তারিখ: ${examMeta.examDate}` : null,
          examMeta.totalMarks ? `পূর্ণমান: ${examMeta.totalMarks}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';

    await this.prisma.$transaction(async (tx) => {
      await tx.writtenUploadBatch.create({
        data: {
          id: batchId,
          batchCode,
          displayName,
          description: input.description?.trim() || autoDescription || null,
          originalFilename,
          mimeType: file.mimetype || 'application/octet-stream',
          fileSha256,
          storagePath,
          status: QuestionUploadStatus.VALIDATED,
          totalRows: parsed.length,
          validCount,
          invalidCount,
          duplicateCount: 0,
          subjectHint: (rootCategory?.name ?? collectionSubject) || null,
          topicHint: resolvedTopicHint || null,
          examCategoryHint: collectionExam || null,
          sheetPreamble,
          examYear: batchExamYear ?? examYearFromDate(batchQuestionDate),
          questionDate: batchQuestionDate,
          duplicateFileBatchId: existingFile?.id ?? null,
          uploadedById: user.userId,
          ...(placementRows.length
            ? {
                placements: {
                  create: placementRows.map((p) => ({
                    id: randomUUID(),
                    categoryId: p.categoryId,
                    subcategoryId: p.subcategoryId,
                    sortOrder: p.sortOrder,
                  })),
                },
              }
            : {}),
        },
      });
      const chunkSize = 500;
      for (let i = 0; i < rowCreates.length; i += chunkSize) {
        await tx.writtenImportRow.createMany({ data: rowCreates.slice(i, i + chunkSize) });
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
    void opts.skipDuplicates;
    await this.prisma.writtenUploadBatch.update({
      where: { id: batchId },
      data: { status: QuestionUploadStatus.IMPORTING, errorMessage: null },
    });
    try {
      return await this.runImport(user, batchId);
    } catch (err) {
      await this.prisma.writtenUploadBatch.update({
        where: { id: batchId },
        data: {
          status: QuestionUploadStatus.FAILED,
          errorMessage: err instanceof Error ? err.message.slice(0, 500) : 'Import failed',
        },
      });
      throw err;
    }
  }

  private async runImport(user: RequestUser, batchId: string) {
    const batch = await this.prisma.writtenUploadBatch.findUniqueOrThrow({
      where: { id: batchId },
      select: {
        id: true,
        examYear: true,
        examCategoryHint: true,
        questionDate: true,
        placements: {
          orderBy: { sortOrder: 'asc' },
          select: {
            categoryId: true,
            subcategoryId: true,
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    const categoryIndex = await this.buildCategoryIndex();
    const primaryPlacement = batch.placements[0] ?? null;
    const placementByTopicKey = new Map<string, string>();
    for (const p of batch.placements) {
      placementByTopicKey.set(
        `${p.categoryId}::${nameKey(p.subcategory.name)}`,
        p.subcategoryId,
      );
    }
    const rows = await this.prisma.writtenImportRow.findMany({
      where: {
        batchId,
        status: { in: [QuestionImportRowStatus.VALID, QuestionImportRowStatus.DUPLICATE] },
      },
      orderBy: { rowNumber: 'asc' },
    });

    let importedCount = 0;
    let failedCount = 0;
    const chunkSize = 25;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await this.prisma.$transaction(
        async (tx) => {
        for (const row of chunk) {
          // PERF-4: per-row savepoint — a failed INSERT must not abort the whole chunk.
          let createdTopicKey: string | null = null;
          await tx.$executeRaw`SAVEPOINT import_row`;
          try {
            if (!row.contentHash) throw new Error('Missing content hash');
            const subject = resolveWrittenRoot(categoryIndex, row.subjectName);
            if (!subject) throw new Error(`Written category not found: ${row.subjectName}`);

            let topicId: string | undefined;
            const topicHint = row.topicName?.trim() || '';
            if (topicHint) {
              topicId =
                placementByTopicKey.get(`${subject.id}::${nameKey(topicHint)}`) ??
                resolveWrittenTopicId(categoryIndex, subject.id, topicHint);
            } else if (primaryPlacement && primaryPlacement.categoryId === subject.id) {
              // No per-row topic — use the batch's primary placement UUID.
              topicId = primaryPlacement.subcategoryId;
            }

            if (!topicId && topicHint) {
              // Auto-create only when the collection had no explicit placements
              // (sheet-driven topic). With placements, fail closed instead of duplicating.
              if (batch.placements.length > 0) {
                throw new Error(
                  `Written subcategory "${topicHint}" was not found under category "${subject.name}"`,
                );
              }
              const slugBase =
                slugifyBatchCode(topicHint).toLowerCase().replace(/_/g, '-') || 'topic';
              const slug = `${subject.slug}-${slugBase}`.slice(0, 100);
              const createdTopic = await tx.category.create({
                data: {
                  name: topicHint.slice(0, 100),
                  slug: `${slug}-${randomUUID().slice(0, 6)}`,
                  parentId: subject.id,
                  scope: CategoryScope.WRITTEN,
                  isActive: true,
                  sortOrder: 99,
                },
              });
              topicId = createdTopic.id;
              createdTopicKey = `${subject.id}::${nameKey(topicHint)}`;
              categoryIndex.topicsByParentAndKey.set(createdTopicKey, topicId);
              categoryIndex.topicNameById.set(topicId, createdTopic.name);
            }

            const examTag = mapExamCategoryToTag(row.examCategory) ?? 'bcs-written';
            const questionDate =
              row.questionDate ??
              parseQuestionDate(row.examYear)?.date ??
              batch.questionDate ??
              null;
            const examYear =
              examYearFromDate(questionDate) ??
              row.examYear?.trim().slice(0, 16) ??
              batch.examYear ??
              null;
            const sourceParts = [
              row.examCategory?.trim(),
              row.source?.trim(),
              examYear ? `Year ${examYear}` : null,
              questionDate ? toIsoDateString(questionDate) : null,
              `Batch ${batchId.slice(0, 8)}`,
            ].filter(Boolean);

            // Written exam papers often ship without model answers. Valid imported
            // rows must still appear on the public Written bank (unlike Preli MCQs,
            // where a correct option is required before publish).
            const publishNow = Boolean(row.questionText?.trim());
            const title = (row.questionText.trim() || '(blank)').slice(0, 200);
            const created = await tx.writtenQuestion.create({
              data: {
                title,
                content: row.questionText,
                modelAnswer: row.modelAnswer?.trim() || null,
                marks: row.marks,
                categoryId: subject.id,
                subcategoryId: topicId,
                status: publishNow ? QuestionStatus.PUBLISHED : QuestionStatus.DRAFT,
                publishedAt: publishNow ? new Date() : null,
                examTags: [examTag],
                sourceNote: sourceParts.join(' · ').slice(0, 240),
                sourceSerial: row.serial?.trim().slice(0, 32) || null,
                examYear,
                questionDate,
                sectionTitle: row.sectionTitle?.trim().slice(0, 500) || null,
                contentHash: row.contentHash,
                uploadBatchId: batchId,
                createdById: user.userId,
              },
              select: { id: true },
            });

            await tx.writtenImportRow.update({
              where: { id: row.id },
              data: {
                status: QuestionImportRowStatus.IMPORTED,
                createdQuestionId: created.id,
                errorMessage: null,
              },
            });
            await tx.$executeRaw`RELEASE SAVEPOINT import_row`;
            importedCount += 1;
          } catch (err) {
            await tx.$executeRaw`ROLLBACK TO SAVEPOINT import_row`;
            // A topic created for this row was rolled back with it — never reuse its id.
            if (createdTopicKey) categoryIndex.topicsByParentAndKey.delete(createdTopicKey);
            failedCount += 1;
            await tx.writtenImportRow.update({
              where: { id: row.id },
              data: {
                status: QuestionImportRowStatus.INVALID,
                errorMessage:
                  err instanceof Error ? err.message.slice(0, 500) : 'Import failed',
              },
            });
          }
        }
        },
        { timeout: 60_000 },
      );
    }

    const skippedCount = await this.prisma.writtenImportRow.count({
      where: { batchId, status: QuestionImportRowStatus.SKIPPED },
    });
    const invalidCount = await this.prisma.writtenImportRow.count({
      where: { batchId, status: QuestionImportRowStatus.INVALID },
    });
    const duplicateCount = await this.prisma.writtenImportRow.count({
      where: { batchId, status: QuestionImportRowStatus.DUPLICATE },
    });
    const newest = await this.prisma.writtenQuestion.findFirst({
      where: { uploadBatchId: batchId, deletedAt: null, questionDate: { not: null } },
      orderBy: [{ questionDate: 'desc' }, { id: 'desc' }],
      select: { questionDate: true, examYear: true },
    });

    await this.prisma.writtenUploadBatch.update({
      where: { id: batchId },
      data: {
        status: QuestionUploadStatus.COMPLETED,
        importedCount,
        failedCount,
        skippedCount,
        invalidCount,
        duplicateCount,
        importedAt: new Date(),
        ...(newest?.questionDate
          ? {
              questionDate: newest.questionDate,
              examYear: newest.examYear ?? examYearFromDate(newest.questionDate),
            }
          : {}),
      },
    });

    return this.getBatch(batchId);
  }

  async archiveBatch(id: string) {
    await this.getBatch(id);
    return this.prisma.writtenUploadBatch.update({
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
          'Completed batches cannot be deleted. Archive instead.',
          newRequestId(),
        ),
      );
    }
    if (batch.status === QuestionUploadStatus.IMPORTING) {
      throw new BadRequestException(
        createErrorResponse('BATCH_BUSY', 'Import in progress', newRequestId()),
      );
    }
    await this.prisma.writtenUploadBatch.delete({ where: { id } });
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
    return {
      buffer: await fs.readFile(batch.storagePath),
      filename: batch.originalFilename,
      mimeType: batch.mimeType,
    };
  }

  async buildReport(id: string) {
    await this.getBatch(id);
    const rows = await this.prisma.writtenImportRow.findMany({
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
    return buildWrittenImportReportBuffer(rows);
  }

  async exportBatchQuestions(id: string) {
    const batch = await this.getBatch(id);
    const questions = await this.prisma.writtenQuestion.findMany({
      where: { uploadBatchId: id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Written Questions');
    sheet.addRow([...WRITTEN_TEMPLATE_HEADERS]);
    let serial = 1;
    for (const q of questions) {
      sheet.addRow([
        q.sourceSerial || String(serial),
        q.content,
        q.sourceNote ?? '',
        q.questionDate ? toIsoDateString(q.questionDate) : '',
        q.marks != null ? String(q.marks) : '',
        q.modelAnswer ?? '',
      ]);
      serial += 1;
    }
    const buf = await workbook.xlsx.writeBuffer();
    return { buffer: Buffer.from(buf), filename: `${batch.batchCode}_written_export.xlsx` };
  }
}
