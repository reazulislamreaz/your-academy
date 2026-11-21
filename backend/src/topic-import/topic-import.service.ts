import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryScope } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { createHash, randomUUID } from 'crypto';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import {
  buildTopicTemplateBuffer,
  parseTopicWorkbook,
} from './excel-parser';

@Injectable()
export class TopicImportService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplateBuffer(): Promise<Buffer> {
    return buildTopicTemplateBuffer();
  }

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
      totalRows: batch.totalRows,
      importedCount: batch.importedCount,
      questionCount: batch._count.questions,
      createdAt: batch.createdAt,
      uploadedBy: batch.uploadedBy,
    };
  }

  async listBatches(limit = 40) {
    const rows = await this.prisma.topicUploadBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true, iconKey: true } },
        uploadedBy: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
    });
    return rows.map((row) => this.mapBatchSummary(row));
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
        include: {
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true, iconKey: true } },
          uploadedBy: { select: { id: true, name: true } },
          _count: { select: { questions: true } },
        },
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
          'Select an active subcategory under the chosen Topic category',
          newRequestId(),
        ),
      );
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
          status: 'COMPLETED',
          totalRows: parsed.rows.length,
          importedCount: parsed.rows.length,
          uploadedById: input.uploadedById,
          importedAt: new Date(),
          questions: {
            create: parsed.rows.map((row, index) => ({
              categoryId: category.id,
              subcategoryId: subcategory.id,
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
        include: {
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true, iconKey: true } },
          _count: { select: { questions: true } },
        },
      });
      return created;
    });

    const withUploader = await this.prisma.topicUploadBatch.findUniqueOrThrow({
      where: { id: batch.id },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true, iconKey: true } },
        uploadedBy: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
    });
    return this.mapBatchSummary(withUploader);
  }

  async getBatch(id: string) {
    const batch = await this.prisma.topicUploadBatch.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true, iconKey: true } },
        uploadedBy: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
    });
    if (!batch) {
      throw new NotFoundException(
        createErrorResponse('BATCH_NOT_FOUND', 'Topic upload batch not found', newRequestId()),
      );
    }
    return this.mapBatchSummary(batch);
  }
}
