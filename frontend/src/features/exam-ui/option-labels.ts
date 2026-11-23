/** Option badge labels. Quiz + practice sets use A–D; Model Tests use Bangla ক–ঘ (DEC-040). */
export const LATIN_OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const BANGLA_OPTION_LABELS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'] as const;

export function optionLabelAt(labels: readonly string[], index: number): string {
  return labels[index] ?? String.fromCharCode(65 + index);
}
