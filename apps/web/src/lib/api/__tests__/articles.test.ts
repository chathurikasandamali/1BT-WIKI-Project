const mockApiFetch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { fetchMyArticles, type ListMineResult } from '@/lib/api/articles';
import { getFormattedISODate } from '@/lib/utils/date';

const sampleResult: ListMineResult = {
  articles: [
    {
      id: 'a1',
      title: 'Test Article',
      authorId: 'u1',
      tags: ['tag1'],
      status: 'Published',
      createdAt: getFormattedISODate('2026-01-01'),
      updatedAt: getFormattedISODate('2026-01-02'),
      likeCount: 3,
      commentCount: 1,
      views: 5,
      rejectionFeedback: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
};

describe('fetchMyArticles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiFetch with default page and limit', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: sampleResult });

    await fetchMyArticles();

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/mine?page=1&limit=20');
  });

  it('calls apiFetch with custom page and limit', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: sampleResult });

    await fetchMyArticles(3, 5);

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/mine?page=3&limit=5');
  });

  it('resolves with data on success', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: sampleResult });

    const result = await fetchMyArticles();

    expect(result).toEqual(sampleResult);
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: false,
      error: 'Not authenticated',
    });

    await expect(fetchMyArticles()).rejects.toThrow('Not authenticated');
  });

  it('throws a fallback message when success is true but data is missing', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: undefined });

    await expect(fetchMyArticles()).rejects.toThrow('Failed to load articles');
  });
});
