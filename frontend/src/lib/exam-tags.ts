export const EXAM_TRACKS = [
  { tag: 'bcs-prelim', label: 'BCS Preliminary' },
  { tag: 'bcs-written', label: 'BCS Written-style' },
  { tag: 'bank', label: 'Bank Recruitment' },
  { tag: 'primary-teacher', label: 'Primary Teacher' },
  { tag: 'ntrca', label: 'NTRCA' },
  { tag: 'govt-job', label: 'Government Jobs' },
  { tag: 'non-cadre', label: 'Non-Cadre' },
  { tag: 'judicial', label: 'Judicial Service' },
  { tag: 'ministry', label: 'Ministry & Department' },
  { tag: 'other-competitive', label: 'Other Competitive' },
] as const;

export type ExamTag = (typeof EXAM_TRACKS)[number]['tag'];

export function examLabel(tag?: string | null): string {
  if (!tag) return 'General';
  return EXAM_TRACKS.find((t) => t.tag === tag)?.label ?? tag;
}

export function practiceKindLabel(kind: string): string {
  switch (kind) {
    case 'DAILY_QUIZ':
      return 'Daily quiz';
    case 'SUBJECT_QUIZ':
      return 'Subject quiz';
    case 'TOPIC_QUIZ':
      return 'Topic quiz';
    case 'MODEL_TEST':
      return 'Model test';
    case 'PREVIOUS_YEAR_SET':
      return 'Previous-year style';
    default:
      return kind;
  }
}
