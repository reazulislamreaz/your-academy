import {
  buildWrittenCategoryIndex,
  nameKey,
  resolveWrittenRoot,
  resolveWrittenTopicId,
} from '../written-taxonomy';

describe('written-taxonomy', () => {
  const categories = [
    { id: 'root-1', name: 'BCS Written', slug: 'bcs-written', parentId: null },
    { id: 'sub-1', name: 'Bangla', slug: 'bcs-written-bangla', parentId: 'root-1' },
    { id: 'sub-2', name: 'English', slug: 'bcs-written-english', parentId: 'root-1' },
    { id: 'root-2', name: 'Bank Written', slug: 'bank-written', parentId: null },
    { id: 'sub-3', name: 'Bangla', slug: 'bank-written-bangla', parentId: 'root-2' },
  ];

  const index = buildWrittenCategoryIndex(categories);

  it('nameKey collapses whitespace and uses Bangla locale lowercasing', () => {
    expect(nameKey('  BCS   Written ')).toBe(nameKey('bcs written'));
  });

  it('resolves root by name or slug', () => {
    expect(resolveWrittenRoot(index, 'BCS Written')?.id).toBe('root-1');
    expect(resolveWrittenRoot(index, 'bcs-written')?.id).toBe('root-1');
    expect(resolveWrittenRoot(index, 'missing')).toBeNull();
  });

  it('resolves subcategory by name, slug, or UUID scoped to parent', () => {
    expect(resolveWrittenTopicId(index, 'root-1', 'Bangla')).toBe('sub-1');
    expect(resolveWrittenTopicId(index, 'root-1', 'bcs-written-bangla')).toBe('sub-1');
    expect(resolveWrittenTopicId(index, 'root-1', 'sub-1')).toBe('sub-1');
    // Same display name under a different parent must not match.
    expect(resolveWrittenTopicId(index, 'root-1', 'sub-3')).toBeUndefined();
    expect(resolveWrittenTopicId(index, 'root-2', 'Bangla')).toBe('sub-3');
  });
});
