import { isBlankAnswerToken, normalizeCorrectAnswer } from '../excel-parser';

describe('normalizeCorrectAnswer', () => {
  it('returns null for empty / whitespace (missing answer)', () => {
    expect(normalizeCorrectAnswer('')).toBeNull();
    expect(normalizeCorrectAnswer('   ')).toBeNull();
    expect(normalizeCorrectAnswer(null)).toBeNull();
    expect(normalizeCorrectAnswer(undefined)).toBeNull();
  });

  it('returns null for common blank placeholders (not invalid)', () => {
    for (const token of ['-', '—', 'N/A', 'na', '?', '.', 'নাই', 'নেই', 'TBD']) {
      expect(isBlankAnswerToken(token)).toBe(true);
      expect(normalizeCorrectAnswer(token)).toBeNull();
    }
  });

  it('treats Note / annotation cells as missing answers (Excel unanswered marker)', () => {
    for (const token of ['Note', 'Notes', 'NOTE', 'Note:', 'see note', 'নোট', 'মন্তব্য']) {
      expect(isBlankAnswerToken(token)).toBe(true);
      expect(normalizeCorrectAnswer(token)).toBeNull();
    }
    expect(isBlankAnswerToken('Note - answer later')).toBe(true);
    expect(normalizeCorrectAnswer('Note - answer later')).toBeNull();
  });

  it('maps Bangla and Latin letters', () => {
    expect(normalizeCorrectAnswer('ক')).toBe('A');
    expect(normalizeCorrectAnswer('B')).toBe('B');
    expect(normalizeCorrectAnswer('ঘ.')).toBe('D');
  });

  it('returns null for unparseable non-empty values', () => {
    expect(isBlankAnswerToken('maybe')).toBe(false);
    expect(normalizeCorrectAnswer('maybe')).toBeNull();
    expect(normalizeCorrectAnswer('5')).toBeNull();
  });
});
