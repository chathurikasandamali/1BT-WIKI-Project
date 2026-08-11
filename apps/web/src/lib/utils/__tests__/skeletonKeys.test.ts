import { skeletonKeys } from '../skeletonKeys';

describe('skeletonKeys', () => {
  it('returns the correct count, uses the prefix, and produces unique keys', () => {
    const items = skeletonKeys('pref_', 5);
    expect(items).toHaveLength(5);
    const keys = items.map((i) => i.key);
    // All keys include the prefix
    keys.forEach((k) => expect(k.startsWith('pref_')).toBe(true));
    // Keys are unique
    expect(new Set(keys).size).toBe(5);
  });
});
