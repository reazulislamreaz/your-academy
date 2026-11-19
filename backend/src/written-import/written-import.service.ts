import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
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
    },
  ) {
    await this.getBatch(id);
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
    return this.prisma.writtenUploadBatch.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined
          ? { displayName: dto.displayName.trim().slice(0, 200) }
          : {}),
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

  private nameKey(name: string): string {
    return name.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private async buildCategoryIndex() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, parentId: true },
    });
    const rootsByName = new Map<string, { id: string; name: string; slug: string }>();
    const topicsByParentAndName = new Map<string, string>();
    for (const c of categories) {
      if (!c.parentId) rootsByName.set(this.nameKey(c.name), c);
      else topicsByParentAndName.set(`${c.parentId}::${this.nameKey(c.name)}`, c.id);
    }
    return { rootsByName, topicsByParentAndName };
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

    const categoryIndex = await this.buildCategoryIndex();
    const collectionSubject = input.subjectHint?.trim() || '';
    const collectionTopic = input.topicHint?.trim() || '';
    const collectionExam =
      input.examCategoryHint?.trim() ||
      [examMeta?.examTitle, examMeta?.postName].filter(Boolean).join(' — ').slice(0, 120) ||
      '';
    const sheetHasCategory = parsed.some((row) => Boolean(row.subject?.trim()));
    if (!collectionSubject && !sheetHasCategory) {
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_REQUIRED',
          'Category is required for this collection',
          newRequestId(),
        ),
      );
    }

    const rootCategory = collectionSubject
      ? categoryIndex.rootsByName.get(this.nameKey(collectionSubject))
      : null;
    if (collectionSubject && !rootCategory) {
      throw new BadRequestException(
        createErrorResponse(
          'CATEGORY_NOT_FOUND',
          `Category not found: ${collectionSubject}`,
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
    if (rootCategory && collectionTopic) {
      pushPlacementId(
        categoryIndex.topicsByParentAndName.get(
          `${rootCategory.id}::${this.nameKey(collectionTopic)}`,
        ),
      );
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
    if (rootCategory && placementIdSet.length) {
      for (let i = 0; i < placementIdSet.length; i += 1) {
        const sub = await this.prisma.category.findFirst({
          where: { id: placementIdSet[i], parentId: rootCategory.id, isActive: true },
          select: { id: true, name: true },
        });
        if (!sub) {
          throw new BadRequestException(
            createErrorResponse(
              'SUBCATEGORY_INVALID',
              'Each placement must be an active subcategory of the selected category',
              newRequestId(),
            ),
          );
        }
        placementRows.push({
          categoryId: rootCategory.id,
          subcategoryId: sub.id,
          sortOrder: i,
          name: sub.name,
        });
      }
    }

    const resolvedTopicHint = placementRows[0]?.name?.trim() || collectionTopic || '';
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
      const subjectName = row.subject || collectionSubject;
      const topicName = row.topic || resolvedTopicHint;
      const examCategory = row.examCategory || collectionExam;
      const errors: string[] = [];

      if (!row.question?.trim()) errors.push('Column "প্রশ্ন": question text is required');
      if (!subjectName) {
        errors.push(
          'Category is required — set it in the upload form or add a Subject/বিষয় column',
        );
      }
      const subject = subjectName
        ? categoryIndex.rootsByName.get(this.nameKey(subjectName))
        : null;
      if (subjectName && !subject) errors.push(`Category not found: ${subjectName}`);

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
          subjectHint: collectionSubject || null,
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
      select: { id: true, examYear: true, examCategoryHint: true, questionDate: true },
    });
    const categoryIndex = await this.buildCategoryIndex();
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
      await this.prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          try {
            if (!row.contentHash) throw new Error('Missing content hash');
            const subject = categoryIndex.rootsByName.get(this.nameKey(row.subjectName ?? ''));
            if (!subject) throw new Error(`Category not found: ${row.subjectName}`);

            let topicId = row.topicName
              ? categoryIndex.topicsByParentAndName.get(
                  `${subject.id}::${this.nameKey(row.topicName)}`,
                )
              : undefined;
            if (!topicId && row.topicName) {
              const slugBase =
                slugifyBatchCode(row.topicName).toLowerCase().replace(/_/g, '-') || 'topic';
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

            const publishNow = Boolean(row.modelAnswer?.trim());
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
            importedCount += 1;
          } catch (err) {
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
      });
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
