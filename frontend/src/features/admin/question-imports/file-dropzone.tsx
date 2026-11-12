'use client';

import { FileSpreadsheet, UploadCloud, X } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { ProgressBar } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBytes } from './types';

type Props = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  progress?: number | null;
};

const ACCEPT = '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

export function FileDropzone({ file, onFileChange, disabled, progress }: Props) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = useCallback((next: File | null) => {
    if (!next) {
      onFileChange(null);
      setLocalError(null);
      return;
    }
    const lower = next.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) {
      setLocalError('Only .xlsx and .csv files are supported.');
      return;
    }
    if (next.size > 15 * 1024 * 1024) {
      setLocalError('File must be 15MB or smaller.');
      return;
    }
    setLocalError(null);
    onFileChange(next);
  }, [onFileChange]);

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const dropped = e.dataTransfer.files?.[0] ?? null;
          validate(dropped);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed px-4 py-10 text-center transition-colors',
          dragging
            ? 'border-[var(--highlight)] bg-[var(--highlight-soft)]'
            : 'border-[var(--line)] bg-[var(--bg-desk)] hover:border-[var(--highlight)]/50 hover:bg-white',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-white shadow-[var(--shadow-sm)]">
          <UploadCloud className="size-5 text-[var(--highlight)]" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            Drag & drop your Excel file here
          </p>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">
            or click to browse · .xlsx / .csv · up to 15MB
          </p>
        </div>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept={ACCEPT}
          disabled={disabled}
          onChange={(e) => validate(e.target.files?.[0] ?? null)}
        />
      </label>

      {localError ? (
        <p className="text-sm font-medium text-[var(--danger-fg)]" role="alert">
          {localError}
        </p>
      ) : null}

      {file ? (
        <div className="flex items-start gap-3 rounded-[12px] border border-[var(--line)] bg-white p-3 shadow-[var(--shadow-sm)]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--success-soft)] text-[var(--success)]">
            <FileSpreadsheet className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">{file.name}</p>
            <p className="text-sm text-[var(--muted-strong)]">
              {formatBytes(file.size)} · {file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'XLSX'}
              {progress == null ? ' · Ready to validate' : null}
            </p>
            {progress != null ? (
              <ProgressBar value={progress} className="mt-2" label="Upload progress" />
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-pointer"
            disabled={disabled}
            onClick={() => validate(null)}
            aria-label="Remove file"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
