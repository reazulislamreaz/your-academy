import { paginateById, parseLimit } from '../pagination';

describe('pagination helpers', () => {
  it('clamps limit to max and floors invalid values', () => {
    expect(parseLimit(undefined, 20)).toBe(20);
    expect(parseLimit('0', 20)).toBe(20);
    expect(parseLimit('999', 20, 100)).toBe(100);
    expect(parseLimit(12.9, 20)).toBe(12);
  });

  it('returns nextCursor only when more rows exist', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(paginateById(rows, 2)).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      nextCursor: 'b',
    });
    expect(paginateById(rows.slice(0, 2), 2)).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      nextCursor: null,
    });
  });
});
