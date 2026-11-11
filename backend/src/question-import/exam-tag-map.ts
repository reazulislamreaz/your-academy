/** Map free-text Exam Category cells → Question.examTags values. */
const MAP: Array<{ match: RegExp; tag: string }> = [
  { match: /\bbcs\b.*prelim|prelim.*bcs|\bbcs\b/i, tag: 'bcs-prelim' },
  { match: /written/i, tag: 'bcs-written' },
  { match: /\bbank\b/i, tag: 'bank' },
  { match: /primary|প্রাথমিক/i, tag: 'primary-teacher' },
  { match: /ntrca/i, tag: 'ntrca' },
  { match: /non[- ]?cadre/i, tag: 'non-cadre' },
  { match: /judicial|judge|বিচার/i, tag: 'judicial' },
  { match: /ministry|department|মন্ত্রণালয়/i, tag: 'ministry' },
  { match: /govt|government|সরকারি/i, tag: 'govt-job' },
  { match: /other|অন্যান্য|competitive/i, tag: 'other-competitive' },
];

export function mapExamCategoryToTag(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  for (const entry of MAP) {
    if (entry.match.test(value)) return entry.tag;
  }
  return 'other-competitive';
}

export function parseDifficulty(raw?: string | null): 'EASY' | 'MEDIUM' | 'HARD' | null {
  if (!raw?.trim()) return 'MEDIUM';
  const v = raw.trim().toLowerCase();
  if (v === 'easy' || v === 'সহজ') return 'EASY';
  if (v === 'medium' || v === 'মধ্যম' || v === 'moderate') return 'MEDIUM';
  if (v === 'hard' || v === 'কঠিন' || v === 'difficult') return 'HARD';
  return null;
}
