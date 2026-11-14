'use client';

import { CalendarDays, Clock3, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { parseSheetPreamble, type ExamSchedule } from './parse-sheet-preamble';

type Props = {
  preamble: string;
  className?: string;
};

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 py-3 sm:px-4">
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-[var(--ink)] sm:text-[0.9375rem]">
          {value}
        </p>
      </div>
    </div>
  );
}

function ScheduleBlock({
  schedule,
  index,
  total,
}: {
  schedule: ExamSchedule;
  index: number;
  total: number;
}) {
  return (
    <div className="space-y-2.5">
      {total > 1 ? (
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)]">
          সময়সূচি {index + 1}
        </p>
      ) : null}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <MetaItem
          icon={<CalendarDays className="size-4" strokeWidth={2} />}
          label="পরীক্ষার তারিখ"
          value={schedule.dateLabel}
        />
        <MetaItem
          icon={<Clock3 className="size-4" strokeWidth={2} />}
          label="পরীক্ষার সময়"
          value={schedule.duration?.trim() || '—'}
        />
        <MetaItem
          icon={<ScrollText className="size-4" strokeWidth={2} />}
          label="পূর্ণমান"
          value={schedule.totalMarks?.trim() || '—'}
        />
      </div>
    </div>
  );
}

/**
 * Premium exam information card parsed from Excel sheet preamble.
 * Falls back to plain preamble text when structure cannot be inferred.
 */
export function ExamInfoCard({ preamble, className }: Props) {
  const parsed = parseSheetPreamble(preamble);

  if (!parsed?.structured) {
    return (
      <div
        className={cn(
          'type-prose rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-4 whitespace-pre-wrap text-[var(--ink-soft)] shadow-[var(--shadow-sm)] sm:px-5',
          className,
        )}
      >
        {preamble}
      </div>
    );
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-sm)]',
        className,
      )}
      aria-label="পরীক্ষার তথ্য"
    >
      <div className="border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--accent-soft)_50%,white)] px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
          Exam information
        </p>
        {parsed.examName ? (
          <div className="mt-3">
            <span className="inline-flex max-w-full items-center rounded-full border border-[var(--accent)]/20 bg-white/90 px-3.5 py-1.5 text-sm font-bold tracking-wide text-[var(--accent)] shadow-sm">
              {parsed.examName}
            </span>
          </div>
        ) : null}
        {parsed.positionName ? (
          <div className={cn(parsed.examName ? 'mt-3.5' : 'mt-3')}>
            <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)]">
              পদের নাম
            </p>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-[1.35rem]">
              {parsed.positionName}
            </h2>
          </div>
        ) : null}
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        {parsed.schedules.length > 0 ? (
          parsed.schedules.map((schedule, index) => (
            <ScheduleBlock
              key={`${schedule.dateRaw ?? schedule.dateLabel}-${index}`}
              schedule={schedule}
              index={index}
              total={parsed.schedules.length}
            />
          ))
        ) : (
          <p className="text-sm text-[var(--muted-strong)]">সময়সূচির তথ্য পাওয়া যায়নি।</p>
        )}

        {parsed.leftover.length > 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-[var(--bg-muted)] px-3.5 py-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            {parsed.leftover.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
