import { ExamCard, type ExamCardStatus } from '@/features/exam-ui/exam-card';
import type { PracticeSetListItem } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';

export function PracticeSetCard({
  set,
  status,
}: {
  set: PracticeSetListItem;
  status?: ExamCardStatus;
}) {
  const minutes =
    set.durationSeconds != null ? Math.max(1, Math.round(set.durationSeconds / 60)) : null;
  const tags = [
    set.subcategory?.name ?? set.category?.name,
    set.examTag ? examLabel(set.examTag) : null,
  ].filter((t): t is string => Boolean(t));

  return (
    <ExamCard
      href={`/practice/${set.slug}`}
      title={set.title}
      kindLabel={practiceKindLabel(set.kind)}
      tags={tags}
      description={set.description}
      questionCount={set.questionCount}
      durationMinutes={minutes}
      totalMarks={set.marksPerCorrect * set.questionCount}
      negativeMark={set.negativeMarkPerWrong}
      status={status}
    />
  );
}
