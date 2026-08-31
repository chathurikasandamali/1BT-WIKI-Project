import { formatDate } from '@/lib/utils/date';

describe('formatDate', () => {
  it('formats ISO strings using en-GB short month format', () => {
    expect(formatDate('2026-01-05T12:00:00.000Z')).toBe('05 Jan 2026');
    expect(formatDate('2026-06-15T12:00:00.000Z')).toBe('15 Jun 2026');
  });
});
