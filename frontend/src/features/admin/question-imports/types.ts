export type UploadBatch = {
  id: string;
  batchCode: string;
  displayName: string;
  description?: string | null;
  originalFilename: string;
  status: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  importedCount: number;
  skippedCount?: number;
  failedCount?: number;
  subjectHint?: string | null;
  topicHint?: string | null;
  examCategoryHint?: string | null;
  examYear?: string | null;
  sheetPreamble?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  importedAt?: string | null;
  uploadedBy: { id: string; name: string };
  duplicateFileBatchId?: string | null;
  duplicateFileBatch?: { id: string; batchCode: string; displayName: string } | null;
  placements?: Array<{
    id: string;
    categoryId: string;
    subcategoryId: string;
    sortOrder: number;
    subcategory: { id: string; name: string; slug: string };
    category: { id: string; name: string; slug: string };
  }>;
};

export type ImportRow = {
  id: string;
  rowNumber: number;
  status: string;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  correctAnswer?: string | null;
  difficulty?: string | null;
  subjectName?: string | null;
  topicName?: string | null;
  examCategory?: string | null;
  errorMessage?: string | null;
};

export type ImportStats = {
  totalCollections: number;
  totalRowsProcessed: number;
  successfullyImported: number;
  duplicateQuestions: number;
  failedImports: number;
  recentUploads: Array<{
    id: string;
    batchCode: string;
    displayName: string;
    status: string;
    importedCount: number;
    totalRows: number;
    createdAt: string;
    uploadedBy: { id: string; name: string };
  }>;
};

export function slugifyBatchCode(input: string): string {
  return input
    .normalize('NFC')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusTone(
  status: string,
): 'success' | 'danger' | 'outline' | 'highlight' | 'warning' | 'info' {
  switch (status) {
    case 'COMPLETED':
    case 'VALID':
    case 'IMPORTED':
      return 'success';
    case 'FAILED':
    case 'INVALID':
      return 'danger';
    case 'DUPLICATE':
    case 'SKIPPED':
    case 'ARCHIVED':
      return 'warning';
    case 'VALIDATED':
      return 'info';
    case 'IMPORTING':
    case 'PENDING':
      return 'info';
    default:
      return 'outline';
  }
}
