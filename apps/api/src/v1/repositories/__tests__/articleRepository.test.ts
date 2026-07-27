// apps/api/src/v1/repositories/__tests__/articleRepository.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mock registration — must be before any import of the repository ─────

const mockFindMany = jest.fn<any>();
const mockCount = jest.fn<any>();

await jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    article: {
      findMany: mockFindMany,
      count: mockCount,
    },
  },
}));

// Import AFTER mock is registered (ESM requirement)
const { default: ArticleRepository } = await import('../articleRepository.js');

describe('ArticleRepository.findByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should query published, non-deleted articles with the expected pagination and ordering', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus('Published', 2, 10);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];

    expect(findManyArgs.where).toEqual({
      status: 'Published',
      deletedAt: null,
    });
    expect(findManyArgs.orderBy).toEqual({ createdAt: 'desc' });
    expect(findManyArgs.skip).toBe(10);
    expect(findManyArgs.take).toBe(10);
  });

  it('should request a filtered comment count that excludes soft-deleted comments, and an unfiltered like count', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus('Published', 1, 20);

    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];

    expect(findManyArgs.include).toEqual({
      _count: {
        select: {
          likes: true,
          comments: { where: { deletedAt: null } },
        },
      },
    });
  });

  it('should call prisma.article.count with the same where clause used for findMany', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus('Published', 1, 20);

    expect(mockCount).toHaveBeenCalledTimes(1);
    const [countArgs] = mockCount.mock.calls[0] as [any];
    expect(countArgs.where).toEqual({ status: 'Published', deletedAt: null });
  });

  it('should return the articles and total as resolved by prisma', async () => {
    const mockArticles = [
      { id: 'article-1', title: 'Title 1', _count: { likes: 3, comments: 1 } },
    ];
    mockFindMany.mockResolvedValue(mockArticles);
    mockCount.mockResolvedValue(1);

    const result = await ArticleRepository.findByStatus('Published', 1, 20);

    expect(result).toEqual({ articles: mockArticles, total: 1 });
  });

  it('should query with search parameter correctly', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus('Published', 1, 10, { search: 'react' });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];
    expect(findManyArgs.where).toEqual({
      status: 'Published',
      deletedAt: null,
      title: { contains: 'react', mode: 'insensitive' },
    });

    expect(mockCount).toHaveBeenCalledTimes(1);
    const [countArgs] = mockCount.mock.calls[0] as [any];
    expect(countArgs.where).toEqual({
      status: 'Published',
      deletedAt: null,
      title: { contains: 'react', mode: 'insensitive' },
    });
  });

  it('should query with custom sort and order combinations correctly', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus('Published', 1, 10, { sort: 'views', order: 'asc' });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];
    expect(findManyArgs.orderBy).toEqual({ views: 'asc' });
  });

  it('should fall back to createdAt desc for invalid sort field', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus('Published', 1, 10, { sort: 'invalidField', order: 'asc' });

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];
    expect(findManyArgs.orderBy).toEqual({ createdAt: 'asc' });
  });
});

describe('ArticleRepository.findByAuthor', () => {
  const authorId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should query non-deleted articles for the given author regardless of status, with the expected pagination and ordering', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByAuthor(authorId, 2, 10);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];

    expect(findManyArgs.where).toEqual({ authorId, deletedAt: null });
    expect(findManyArgs.orderBy).toEqual({ createdAt: 'desc' });
    expect(findManyArgs.skip).toBe(10);
    expect(findManyArgs.take).toBe(10);
  });

  it('should request filtered comments, an unfiltered like count, and latest rejected review feedback', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByAuthor(authorId, 1, 20);

    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];

    expect(findManyArgs.include).toEqual({
      _count: {
        select: {
          likes: true,
          comments: { where: { deletedAt: null } },
        },
      },
      reviews: {
        where: {
          status: 'Rejected',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          feedback: true,
        },
      },
    });
  });

  it('should call prisma.article.count with the same where clause used for findMany', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByAuthor(authorId, 1, 20);

    expect(mockCount).toHaveBeenCalledTimes(1);
    const [countArgs] = mockCount.mock.calls[0] as [any];
    expect(countArgs.where).toEqual({ authorId, deletedAt: null });
  });

  it('should return the articles and total as resolved by prisma', async () => {
    const mockArticles = [
      {
        id: 'article-1',
        title: 'Title 1',
        authorId,
        status: 'Draft',
        _count: { likes: 3, comments: 1 },
      },
    ];
    mockFindMany.mockResolvedValue(mockArticles);
    mockCount.mockResolvedValue(1);

    const result = await ArticleRepository.findByAuthor(authorId, 1, 20);

    expect(result).toEqual({ articles: mockArticles, total: 1 });
  });
});
