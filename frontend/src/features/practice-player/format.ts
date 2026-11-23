export function formatDurationMinutes(seconds: number) {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

/** Quick picks shown in prestart (seconds). */
export const TIMER_PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
  { label: '90 min', seconds: 90 * 60 },
  { label: '120 min', seconds: 120 * 60 },
] as const;

export const TIMER_CUSTOM_MIN_MINUTES = 5;
export const TIMER_CUSTOM_MAX_MINUTES = 180;

/** Rough pacing hint for learners before start. */
export function estimateMinutesForQuestions(questionCount: number): number {
  // ~1.2 min / MCQ, rounded to 5.
  const raw = Math.ceil(questionCount * 1.2);
  return Math.max(5, Math.ceil(raw / 5) * 5);
}
