'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { apiFetchResult } from '@/lib/api/client';
import type { ImportRow, UploadBatch } from './types';

const LIST_LIMIT = 200;

/** "Row 12: Answer is …; …" → "Row 12 (Answer is …; …)". */
function describe(row: ImportRow): string {
  const reason = (row.errorMessage ?? '').replace(/^Row \d+:\s*/, '') || 'invalid';
  return `Row ${row.rowNumber} (${reason})`;
}

/**
 * IBA batches only — one-line summary of what was imported and which rows were skipped and
 * why (e.g. "485 questions imported. 3 rows skipped: Row 12 (…), Row 40 (…)").
 */
export function IbaSkippedSummary({ batch }: { batch: UploadBatch }) {
  const invalid = useQuery({
    queryKey: ['admin-question-import-rows', batch.id, 'INVALID', 'iba-summary', batch.status],
    queryFn: () =>
      apiFetchResult<ImportRow[]>(
        `/admin/question-imports/${batch.id}/rows?status=INVALID&limit=${LIST_LIMIT}`,
      ),
    enabled: (batch.invalidCount ?? 0) > 0,
  });

  const skipped = batch.invalidCount ?? 0;
  const done = batch.status === 'COMPLETED';
  const lead = done
    ? `${batch.importedCount ?? 0} question${batch.importedCount === 1 ? '' : 's'} imported.`
    : `${batch.validCount ?? 0} question${batch.validCount === 1 ? '' : 's'} ready to import.`;

  if (!skipped) {
    return <Alert variant="success">IBA upload: {lead} No rows skipped.</Alert>;
  }
  const rows = invalid.data?.data ?? [];
  return (
    <Alert variant="warning">
      <span>
        IBA upload: {lead} {skipped} row{skipped === 1 ? '' : 's'} skipped
        {rows.length ? `: ${rows.map(describe).join(', ')}` : '.'}
        {skipped > rows.length && rows.length ? ` … and ${skipped - rows.length} more.` : ''}
      </span>
    </Alert>
  );
}
