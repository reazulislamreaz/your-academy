import { FolderOpen } from 'lucide-react';

/** Placeholder — Written Question Bank is intentionally empty for now. */
export default function WrittenQuestionBankPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-6 py-20 text-center shadow-[var(--shadow-sm)]">
        <FolderOpen className="mx-auto size-10 text-[var(--muted)] opacity-50" aria-hidden />
        <h1 className="mt-4 font-display text-xl font-bold text-[var(--ink)] sm:text-2xl">
          Written Question Bank
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted-strong)]">
          No written collections yet. Content will appear here when published.
        </p>
      </div>
    </div>
  );
}
