/** Study-time helpers. Preferences themselves are persisted via PATCH /users/me/study-prefs. */

export function formatStudyMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

/** Home KPI style — e.g. `48.5 hrs`. */
export function formatStudyHours(seconds: number): string {
  if (seconds <= 0) return '0 hrs';
  const hours = seconds / 3600;
  if (hours < 1) {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `${mins} min`;
  }
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hrs`;
}
