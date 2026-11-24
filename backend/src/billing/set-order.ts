import { Prisma, QuestionStatus, QuestionUploadStatus } from '@prisma/client';

/**
 * DEC-060 — the order Preli / Written sets are shown in, shared by the public lists and
 * the "first N sets are free" rule so both always agree: newest question date first
 * (undated last), then newest upload, then id.
 */
export const SET_DISPLAY_ORDER = [
  { questionDate: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
  { id: 'desc' },
] as const satisfies Prisma.QuestionUploadBatchOrderByWithRelationInput[];

const LISTED_STATUSES = [QuestionUploadStatus.COMPLETED, QuestionUploadStatus.ARCHIVED];

/** A Preli set appears on the public list (unfiltered) — finished import, ≥1 live MCQ. */
export const LISTED_PRELI_SET_WHERE = {
  status: { in: LISTED_STATUSES },
  questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
} satisfies Prisma.QuestionUploadBatchWhereInput;

/** A Written set appears on the public list (unfiltered) — finished import, ≥1 live question. */
export const LISTED_WRITTEN_SET_WHERE = {
  status: { in: LISTED_STATUSES },
  questions: { some: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
} satisfies Prisma.WrittenUploadBatchWhereInput;
