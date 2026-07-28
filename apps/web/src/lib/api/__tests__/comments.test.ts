const mockApiFetch = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import {
  fetchComments,
  postComment,
  updateComment,
  deleteComment,
  type CommentWithAuthor,
  type Comment,
} from '@/lib/api/comments';

const sampleComment: CommentWithAuthor = {
  id: 'c1',
  articleId: 'a1',
  createdBy: 'u1',
  body: 'Great article!',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  authorName: 'Test User',
  authorImage: null,
};

const sampleCreated: Comment = {
  id: 'c2',
  articleId: 'a1',
  createdBy: 'u1',
  body: 'New comment',
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('fetchComments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiFetch with the article comments path', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      data: [sampleComment],
    });

    await fetchComments('a1');

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/a1/comments');
  });

  it('resolves with data on success', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      data: [sampleComment],
    });

    const result = await fetchComments('a1');

    expect(result).toEqual([sampleComment]);
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: false,
      error: 'Article not found',
    });

    await expect(fetchComments('a1')).rejects.toThrow('Article not found');
  });

  it('throws a fallback message when success is true but data is missing', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: undefined });

    await expect(fetchComments('a1')).rejects.toThrow(
      'Failed to load comments'
    );
  });
});

describe('postComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiFetch with POST and the trimmed body', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: sampleCreated });

    await postComment('a1', 'New comment');

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/a1/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'New comment' }),
    });
  });

  it('resolves with data on success', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: sampleCreated });

    const result = await postComment('a1', 'New comment');

    expect(result).toEqual(sampleCreated);
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: false,
      error: 'Comment body is required and cannot be empty',
    });

    await expect(postComment('a1', '')).rejects.toThrow(
      'Comment body is required and cannot be empty'
    );
  });

  it('throws a fallback message when success is true but data is missing', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: undefined });

    await expect(postComment('a1', 'New comment')).rejects.toThrow(
      'Failed to post comment'
    );
  });
});

describe('updateComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiFetch with PATCH and the updated body', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: sampleCreated });

    await updateComment('a1', 'c2', 'Updated text');

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/a1/comments/c2', {
      method: 'PATCH',
      body: JSON.stringify({ body: 'Updated text' }),
    });
  });

  it('resolves with data on success', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: sampleCreated });

    const result = await updateComment('a1', 'c2', 'Updated text');

    expect(result).toEqual(sampleCreated);
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: false,
      error: 'Only the comment owner can edit this comment',
    });

    await expect(updateComment('a1', 'c2', 'Updated text')).rejects.toThrow(
      'Only the comment owner can edit this comment'
    );
  });

  it('throws a fallback message when success is true but data is missing', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: undefined });

    await expect(updateComment('a1', 'c2', 'Updated text')).rejects.toThrow(
      'Failed to update comment'
    );
  });
});

describe('deleteComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiFetch with DELETE', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: null });

    await deleteComment('a1', 'c1');

    expect(mockApiFetch).toHaveBeenCalledWith('/articles/a1/comments/c1', {
      method: 'DELETE',
    });
  });

  it('resolves without throwing on success', async () => {
    mockApiFetch.mockResolvedValueOnce({ success: true, data: null });

    await expect(deleteComment('a1', 'c1')).resolves.toBeUndefined();
  });

  it('throws the returned error message when success is false', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: false,
      error: 'Only the comment owner can delete this comment',
    });

    await expect(deleteComment('a1', 'c1')).rejects.toThrow(
      'Only the comment owner can delete this comment'
    );
  });
});
