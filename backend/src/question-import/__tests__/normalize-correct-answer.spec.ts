import { normalizeCorrectAnswer } from '../excel-parser';

describe('normalizeCorrectAnswer', () => {
  it('returns null for empty / whitespace (missing answer)', () => {
    expect(normalizeCorrectAnswer('')).toBeNull();
    expect(normalizeCorrectAnswer('   ')).toBeNull();
  });

  it('maps Bangla and Latin letters', () => {
    expect(normalizeCorrectAnswer('ক')).toBe('A');
    expect(normalizeCorrectAnswer('B')).toBe('B');
    expect(normalizeCorrectAnswer('ঘ.')).toBe('D');
  });

  it('returns null for unparseable non-empty values', () => {
    expect(normalizeCorrectAnswer('maybe')).toBeNull();
    expect(normalizeCorrectAnswer('5')).toBeNull();
  });
});
