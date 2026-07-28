const mockApiFetch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { likeArticle, unlikeArticle } from '@/lib/api/likes';

describe('likeArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiFetch with POST and the article like path', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: { liked: true } });

    await likeArticle('a1');

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/a1/like', { method: 'POST' });
  });

  it('resolves with data on success', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: { liked: true } });

    const result = await likeArticle('a1');

    expect(result).toEqual({ liked: true });
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: false, error: 'Cannot like this article' });

    await expect(likeArticle('a1')).rejects.toThrow('Cannot like this article');
  });

  it('throws a fallback message when success is true but data is missing', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: undefined });

    await expect(likeArticle('a1')).rejects.toThrow('Failed to like article');
  });
});

describe('unlikeArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiFetch with DELETE and the article like path', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: { liked: false } });

    await unlikeArticle('a1');

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/a1/like', { method: 'DELETE' });
  });

  it('resolves with data on success', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: { liked: false } });

    const result = await unlikeArticle('a1');

    expect(result).toEqual({ liked: false });
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: false, error: 'Article not found' });

    await expect(unlikeArticle('a1')).rejects.toThrow('Article not found');
  });

  it('throws a fallback message when success is true but data is missing', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: undefined });

    await expect(unlikeArticle('a1')).rejects.toThrow('Failed to unlike article');
  });
});
