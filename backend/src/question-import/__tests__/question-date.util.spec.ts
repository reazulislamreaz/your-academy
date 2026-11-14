import { parseQuestionDate, toIsoDateString } from '../question-date.util';

describe('parseQuestionDate', () => {
  it('parses ISO dates', () => {
    const p = parseQuestionDate('2023-03-18');
    expect(p?.isoDate).toBe('2023-03-18');
    expect(p?.examYear).toBe('2023');
  });

  it('parses DD.MM.YYYY and Bangla digits', () => {
    expect(parseQuestionDate('১৮.০৩.২০২৩')?.isoDate).toBe('2023-03-18');
    expect(parseQuestionDate('18/03/2024')?.isoDate).toBe('2024-03-18');
  });

  it('parses year-only as Jan 1', () => {
    expect(parseQuestionDate('2026')?.isoDate).toBe('2026-01-01');
  });

  it('rejects invalid calendars', () => {
    expect(parseQuestionDate('2023-02-31')).toBeNull();
    expect(parseQuestionDate('not-a-date')).toBeNull();
  });

  it('formats Date to ISO date', () => {
    expect(toIsoDateString(new Date(Date.UTC(2025, 0, 5)))).toBe('2025-01-05');
  });
});
