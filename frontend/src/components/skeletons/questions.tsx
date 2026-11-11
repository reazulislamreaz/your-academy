import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Question bank list rows matching `ListRow` meta + title + chevron. */
export function QuestionListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('divide-y divide-[var(--line)] border-y border-[var(--line)]', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-14 rounded-[var(--radius-sm)]" />
            </div>
            <Skeleton className="h-5 w-full max-w-xl" />
            <Skeleton className="h-4 w-[80%] max-w-lg" />
          </div>
          <Skeleton className="mt-1 size-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Single-question practice / preview: stem + 4 options + actions. */
export function QuestionPreviewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-3 border-b border-[var(--line)] pb-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-7 w-full max-w-2xl" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] px-4 py-3.5">
              <Skeleton className="mt-0.5 size-5 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-28 rounded-[var(--radius)]" />
        <Skeleton className="h-11 w-24 rounded-[var(--radius)]" />
      </div>
    </div>
  );
}

/** Bulk-upload row preview table (Bangla-friendly wide cells). */
export function BulkQuestionPreviewSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto rounded-[12px] border border-[var(--line)]', className)}>
      <table className="min-w-[960px] w-full text-left text-sm">
        <thead className="bg-[var(--bg-desk)]">
          <tr>
            {['Row', 'Question', 'Options', 'Answer', 'Subject', 'Diff.', 'Status'].map((h) => (
              <th key={h} className="px-3 py-3">
                <Skeleton className="h-3 w-12" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-t border-[var(--line)] align-top">
              <td className="px-3 py-3">
                <Skeleton className="h-4 w-6" />
              </td>
              <td className="px-3 py-3">
                <Skeleton className="mb-2 h-4 w-64" />
                <Skeleton className="h-4 w-48" />
              </td>
              <td className="space-y-1.5 px-3 py-3">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3.5 w-32" />
              </td>
              <td className="px-3 py-3">
                <Skeleton className="h-4 w-8" />
              </td>
              <td className="px-3 py-3">
                <Skeleton className="mb-1.5 h-3.5 w-24" />
                <Skeleton className="h-3 w-20" />
              </td>
              <td className="px-3 py-3">
                <Skeleton className="h-4 w-12" />
              </td>
              <td className="px-3 py-3">
                <Skeleton className="h-6 w-20 rounded-[var(--radius-sm)]" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Practice / model-test player shell. */
export function ExamSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-64 sm:w-80" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-40 rounded-full" />
        </div>
        <QuestionPreviewSkeleton />
      </Surface>
    </div>
  );
}
