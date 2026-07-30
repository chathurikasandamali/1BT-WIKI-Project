const mockApiFetch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import {
  fetchMyArticles,
  fetchAllArticles,
  type ListMineResult,
  type AdminArticleListResult,
} from '@/lib/api/articles';
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

describe('fetchAllArticles', () => {
  const sampleAdminResult: AdminArticleListResult = {
    articles: [
      {
        id: 'a1',
        title: 'Admin Visible Article',
        authorId: 'u1',
        tags: [],
        status: 'Pending',
        createdAt: getFormattedISODate('2026-01-01'),
        updatedAt: getFormattedISODate('2026-01-02'),
        likeCount: 0,
        commentCount: 0,
        views: 10,
        rejectionFeedback: null,
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
      },
    ],
    total: 1,
    page: 1,
    limit: 12,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the bare admin endpoint when no params are given', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      data: sampleAdminResult,
    });

    await fetchAllArticles();

    expect(mockApiFetch).toHaveBeenCalledWith('/admin/articles');
  });

  it('builds the query string from all provided params', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      data: sampleAdminResult,
    });

    await fetchAllArticles({
      page: 2,
      limit: 10,
      status: 'Pending',
      search: 'react',
      sort: 'views',
      order: 'desc',
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/admin/articles?page=2&limit=10&status=Pending&search=react&sort=views&order=desc'
    );
  });

  it('omits undefined params and empty search from the query string', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      data: sampleAdminResult,
    });

    await fetchAllArticles({ page: 1, limit: 12, search: '' });

    expect(mockApiFetch).toHaveBeenCalledWith('/admin/articles?page=1&limit=12');
  });

  it('resolves with data on success', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      data: sampleAdminResult,
    });

    const result = await fetchAllArticles();

    expect(result).toEqual(sampleAdminResult);
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: false,
      error: 'Insufficient permissions',
    });

    await expect(fetchAllArticles()).rejects.toThrow(
      'Insufficient permissions'
    );
  });
});
