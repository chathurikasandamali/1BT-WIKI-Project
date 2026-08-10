// apps/api/src/v1/repositories/__tests__/articleRepository.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mock registration — must be before any import of the repository ─────

const mockFindMany = jest.fn<any>();
const mockCount = jest.fn<any>();
const mockFindFirst = jest.fn<any>();

await jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: { draft: 'draft', published: 'published', unpublished: 'unpublished' },
  prisma: {
    article: {
      findMany: mockFindMany,
      count: mockCount,
      findFirst: mockFindFirst,
    },
  },
}));

// Import AFTER mock is registered (ESM requirement)
const { default: ArticleRepository } = await import('../articleRepository.js');

describe('ArticleRepository.findByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should query a single article without requester-specific likes if no requesterId is provided', async () => {
      mockFindFirst.mockResolvedValue({ id: 'article-1', _count: { likes: 5, comments: 2 } });
      
      const result = await ArticleRepository.findById('article-1');
      
      expect(mockFindFirst).toHaveBeenCalledTimes(1);
      const [args] = mockFindFirst.mock.calls[0] as [any];
      
      expect(args.where).toEqual({ id: 'article-1', deletedAt: null });
      expect(args.select._count.select.likes).toBe(true);
      expect(args.select._count.select.comments.where.deletedAt).toBe(null);
      expect(args.select.likes).toBeUndefined();
      
      expect(result).toEqual({ id: 'article-1', _count: { likes: 5, comments: 2 } });
    });

    it('should query a single article with requester-specific likes if requesterId is provided', async () => {
      mockFindFirst.mockResolvedValue({ 
        id: 'article-1', 
        _count: { likes: 5, comments: 2 },
        likes: [{ id: 'like-1' }]
      });
      
      const result = await ArticleRepository.findById('article-1', 'user-123');
      
      expect(mockFindFirst).toHaveBeenCalledTimes(1);
      const [args] = mockFindFirst.mock.calls[0] as [any];
      
      expect(args.select.likes).toEqual({
        where: { userId: 'user-123' },
        select: { id: true },
        take: 1,
      });
      
      expect(result).toEqual({ 
        id: 'article-1', 
        _count: { likes: 5, comments: 2 },
        likes: [{ id: 'like-1' }]
      });
    });

    it('should return null if article is not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      
      const result = await ArticleRepository.findById('missing-id', 'user-123');
      
      expect(result).toBeNull();
    });
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

  it('should omit the status key from the where clause entirely when status is undefined (returns all statuses)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus(undefined, 1, 20);

    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];

    // The status key must be absent — not present as undefined — so Prisma returns all statuses.
    expect(findManyArgs.where).not.toHaveProperty('status');
    expect(findManyArgs.where).toEqual({ deletedAt: null });

    const [countArgs] = mockCount.mock.calls[0] as [any];
    expect(countArgs.where).not.toHaveProperty('status');
    expect(countArgs.where).toEqual({ deletedAt: null });
  });

  it('should apply a status "not" filter when status is undefined and excludeStatus is given', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus(undefined, 1, 20, { excludeStatus: 'Draft' });

    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];
    expect(findManyArgs.where).toEqual({
      status: { not: 'Draft' },
      deletedAt: null,
    });

    const [countArgs] = mockCount.mock.calls[0] as [any];
    expect(countArgs.where).toEqual({
      status: { not: 'Draft' },
      deletedAt: null,
    });
  });

  it('should ignore excludeStatus when an explicit status is provided', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await ArticleRepository.findByStatus('Published', 1, 20, { excludeStatus: 'Draft' });

    const [findManyArgs] = mockFindMany.mock.calls[0] as [any];
    expect(findManyArgs.where.status).toBe('Published');
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
