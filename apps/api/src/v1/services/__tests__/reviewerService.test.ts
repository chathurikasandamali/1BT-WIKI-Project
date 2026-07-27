import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import type { ArticleRepository } from '@repositories/articleRepository.js';
import type { ArticleReviewRepository } from '@repositories/articleReviewRepository.js';
import { ReviewStatus } from '@repo/db/generated/prisma/index.js';

jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  ArticleRepository: jest.fn(),
}));

jest.unstable_mockModule('@repositories/articleReviewRepository.js', () => ({
  ArticleReviewRepository: jest.fn(),
}));

jest.unstable_mockModule('@services/notificationService.js', () => ({
  default: {
    send: jest.fn(() => Promise.resolve()),
  },
}));

jest.unstable_mockModule('@repositories/userRepository.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

const { ReviewerService } = await import('../reviewerService.js');

const makeMockArticleRepo = (): jest.Mocked<
  Pick<ArticleRepository, 'findByStatus' | 'findById' | 'updateStatus'>
> => ({
  findByStatus: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
});

const makeMockReviewRepo = (): jest.Mocked<
  Pick<ArticleReviewRepository, 'create'>
> => ({
  create: jest.fn(),
});

const makeMockUserRepo = () => ({
  findById: jest.fn<() => Promise<{ name?: string; email?: string } | null>>(),
});

describe('ReviewerService.listPending', () => {
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockReviewRepo: ReturnType<typeof makeMockReviewRepo>;
  let mockUserRepo: ReturnType<typeof makeMockUserRepo>;
  let service: InstanceType<typeof ReviewerService>;

  beforeEach(() => {
    mockArticleRepo = makeMockArticleRepo();
    mockReviewRepo = makeMockReviewRepo();
    mockUserRepo = makeMockUserRepo();
    service = new ReviewerService(
      mockArticleRepo as unknown as ArticleRepository,
      mockReviewRepo as unknown as ArticleReviewRepository,
      mockUserRepo as never
    );
    jest.clearAllMocks();
  });

  it('should call findByStatus with Pending status and enrich articles with authorName and authorEmail', async () => {
    const mockArticles = [
      {
        id: 'article-1',
        title: 'Pending Article',
        body: { type: 'doc' },
        status: 'Pending',
        authorId: 'user-1',
        tags: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
    ];

    mockArticleRepo.findByStatus.mockResolvedValue({ articles: mockArticles, total: 1 } as never);
    mockUserRepo.findById.mockResolvedValue({ name: 'Jane Author', email: 'jane@example.com' });

    const result = await service.listPending(2, 10);

    expect(mockArticleRepo.findByStatus).toHaveBeenCalledWith('Pending', 2, 10);
    expect(mockArticleRepo.findByStatus).toHaveBeenCalledTimes(1);
    expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      articles: [
        {
          ...mockArticles[0],
          authorName: 'Jane Author',
          authorEmail: 'jane@example.com',
        },
      ],
      total: 1,
      page: 2,
      limit: 10,
    });
    expect(result.articles[0]).not.toHaveProperty('_count');
  });

  it('should fall back to Unknown and null when user is not found', async () => {
    const mockArticles = [
      {
        id: 'article-1',
        title: 'Pending Article',
        status: 'Pending',
        authorId: 'user-missing',
      },
    ];

    mockArticleRepo.findByStatus.mockResolvedValue({ articles: mockArticles, total: 1 } as never);
    mockUserRepo.findById.mockResolvedValue(null);

    const result = await service.listPending();

    expect(result.articles[0]).toEqual({
      ...mockArticles[0],
      authorName: 'Unknown',
      authorEmail: null,
    });
  });

  it('should default page and limit when not provided', async () => {
    mockArticleRepo.findByStatus.mockResolvedValue({
      articles: [],
      total: 0,
    } as never);

    const result = await service.listPending();

    expect(mockArticleRepo.findByStatus).toHaveBeenCalledWith('Pending', 1, 20);
    expect(result).toEqual({ articles: [], total: 0, page: 1, limit: 20 });
  });
});

describe('ReviewerService.approveArticle', () => {
  const articleId = 'article-123';
  const reviewerId = 'reviewer-1';
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockReviewRepo: ReturnType<typeof makeMockReviewRepo>;
  let service: InstanceType<typeof ReviewerService>;

  beforeEach(() => {
    mockArticleRepo = makeMockArticleRepo();
    mockReviewRepo = makeMockReviewRepo();
    service = new ReviewerService(
      mockArticleRepo as unknown as ArticleRepository,
      mockReviewRepo as unknown as ArticleReviewRepository
    );
    jest.clearAllMocks();
  });

  it('should approve a Pending article and create an Approved review record', async () => {
    const pendingArticle = {
      id: articleId,
      title: 'Pending Article',
      body: { type: 'doc' },
      status: 'Pending',
      authorId: 'user-1',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const publishedArticle = { ...pendingArticle, status: 'Published' };

    mockArticleRepo.findById.mockResolvedValue(pendingArticle as never);
    mockArticleRepo.updateStatus.mockResolvedValue(publishedArticle as never);
    mockReviewRepo.create.mockResolvedValue({
      id: 'review-1',
      articleId,
      reviewerId,
      reviewStatus: 'Approved',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await service.approveArticle(articleId, reviewerId);

    expect(mockArticleRepo.findById).toHaveBeenCalledWith(articleId);
    expect(mockArticleRepo.updateStatus).toHaveBeenCalledWith(
      articleId,
      'Published'
    );
    expect(mockReviewRepo.create).toHaveBeenCalledWith({
      articleId,
      reviewerId,
      status: ReviewStatus.Approved,
      feedback: null,
      createdBy: reviewerId,
    });
    expect(result).toEqual(publishedArticle);
  });

  it.each(['Draft', 'Published', 'Rejected'] as const)(
    'should throw 400 when article status is %s',
    async (status) => {
      mockArticleRepo.findById.mockResolvedValue({
        id: articleId,
        status,
        authorId: 'user-1',
      } as never);

      await expect(
        service.approveArticle(articleId, reviewerId)
      ).rejects.toThrow(
        new AppError('Only Pending articles can be approved', 400)
      );

      expect(mockArticleRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockReviewRepo.create).not.toHaveBeenCalled();
    }
  );

  it('should throw 404 when article does not exist', async () => {
    mockArticleRepo.findById.mockResolvedValue(null);

    await expect(service.approveArticle(articleId, reviewerId)).rejects.toThrow(
      new AppError('Article not found', 404)
    );

    expect(mockArticleRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockReviewRepo.create).not.toHaveBeenCalled();
  });
});

describe('ReviewerService.rejectArticle', () => {
  const articleId = 'article-123';
  const reviewerId = 'reviewer-1';
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockReviewRepo: ReturnType<typeof makeMockReviewRepo>;
  let service: InstanceType<typeof ReviewerService>;

  beforeEach(() => {
    mockArticleRepo = makeMockArticleRepo();
    mockReviewRepo = makeMockReviewRepo();
    service = new ReviewerService(
      mockArticleRepo as unknown as ArticleRepository,
      mockReviewRepo as unknown as ArticleReviewRepository
    );
    jest.clearAllMocks();
  });

  it('should throw 400 when feedback is missing or empty', async () => {
    await expect(
      service.rejectArticle(articleId, reviewerId, '')
    ).rejects.toThrow(
      new AppError('Rejection feedback must be at least 10 characters', 400)
    );

    expect(mockArticleRepo.findById).not.toHaveBeenCalled();
    expect(mockArticleRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockReviewRepo.create).not.toHaveBeenCalled();
  });

  it('should throw 400 when feedback is under 10 characters', async () => {
    await expect(
      service.rejectArticle(articleId, reviewerId, 'too short')
    ).rejects.toThrow(
      new AppError('Rejection feedback must be at least 10 characters', 400)
    );

    expect(mockArticleRepo.findById).not.toHaveBeenCalled();
    expect(mockArticleRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockReviewRepo.create).not.toHaveBeenCalled();
  });

  it('should throw 400 when feedback becomes under 10 characters after trimming', async () => {
    await expect(
      service.rejectArticle(articleId, reviewerId, '   short   ')
    ).rejects.toThrow(
      new AppError('Rejection feedback must be at least 10 characters', 400)
    );

    expect(mockArticleRepo.findById).not.toHaveBeenCalled();
    expect(mockArticleRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockReviewRepo.create).not.toHaveBeenCalled();
  });

  it('should pass validation when feedback is exactly 10 characters', async () => {
    const pendingArticle = {
      id: articleId,
      title: 'Pending Article',
      status: 'Pending',
      authorId: 'user-1',
    };
    mockArticleRepo.findById.mockResolvedValue(pendingArticle as never);
    mockArticleRepo.updateStatus.mockResolvedValue({
      ...pendingArticle,
      status: 'Unpublished',
    } as never);

    await service.rejectArticle(articleId, reviewerId, 'exactlyTen');

    expect(mockArticleRepo.findById).toHaveBeenCalledWith(articleId);
    expect(mockArticleRepo.updateStatus).toHaveBeenCalledWith(
      articleId,
      'Unpublished'
    );
    expect(mockReviewRepo.create).toHaveBeenCalledWith({
      articleId,
      reviewerId,
      status: ReviewStatus.Rejected,
      feedback: 'exactlyTen',
      createdBy: reviewerId,
    });
  });

  it('should throw 404 when article does not exist', async () => {
    mockArticleRepo.findById.mockResolvedValue(null);

    await expect(
      service.rejectArticle(articleId, reviewerId, 'valid feedback text')
    ).rejects.toThrow(new AppError('Article not found', 404));

    expect(mockArticleRepo.updateStatus).not.toHaveBeenCalled();
    expect(mockReviewRepo.create).not.toHaveBeenCalled();
  });

  it.each(['Draft', 'Published', 'Rejected'] as const)(
    'should throw 400 when article status is %s',
    async (status) => {
      mockArticleRepo.findById.mockResolvedValue({
        id: articleId,
        status,
        authorId: 'user-1',
      } as never);

      await expect(
        service.rejectArticle(articleId, reviewerId, 'valid feedback text')
      ).rejects.toThrow(
        new AppError('Only Pending articles can be rejected', 400)
      );

      expect(mockArticleRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockReviewRepo.create).not.toHaveBeenCalled();
    }
  );

  it('should reject a Pending article and create a Rejected review record with trimmed feedback', async () => {
    const pendingArticle = {
      id: articleId,
      title: 'Pending Article',
      status: 'Pending',
      authorId: 'user-1',
    };
    const rejectedArticle = { ...pendingArticle, status: 'Rejected' };

    mockArticleRepo.findById.mockResolvedValue(pendingArticle as never);
    mockArticleRepo.updateStatus.mockResolvedValue(rejectedArticle as never);
    mockReviewRepo.create.mockResolvedValue({
      id: 'review-1',
      articleId,
      reviewerId,
      reviewStatus: 'Rejected',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const result = await service.rejectArticle(
      articleId,
      reviewerId,
      '   valid feedback text longer than 10   '
    );

    expect(mockArticleRepo.findById).toHaveBeenCalledWith(articleId);
    expect(mockArticleRepo.updateStatus).toHaveBeenCalledWith(
      articleId,
      'Unpublished'
    );
    expect(mockReviewRepo.create).toHaveBeenCalledWith({
      articleId,
      reviewerId,
      status: ReviewStatus.Rejected,
      feedback: 'valid feedback text longer than 10',
      createdBy: reviewerId,
    });
    expect(result).toEqual(rejectedArticle);
  });
});

describe('ReviewerService.getArticleForReview', () => {
  const articleId = 'article-123';
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockReviewRepo: ReturnType<typeof makeMockReviewRepo>;
  let mockUserRepo: ReturnType<typeof makeMockUserRepo>;
  let service: InstanceType<typeof ReviewerService>;

  beforeEach(() => {
    mockArticleRepo = makeMockArticleRepo();
    mockReviewRepo = makeMockReviewRepo();
    mockUserRepo = makeMockUserRepo();
    service = new ReviewerService(
      mockArticleRepo as unknown as ArticleRepository,
      mockReviewRepo as unknown as ArticleReviewRepository,
      mockUserRepo as never
    );
    jest.clearAllMocks();
  });

  it('should return full article enriched with authorName and authorEmail when Pending', async () => {
    const pendingArticle = {
      id: articleId,
      title: 'Pending Article Title',
      body: { type: 'doc', content: [] },
      status: 'Pending',
      authorId: 'user-1',
      tags: ['test'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockArticleRepo.findById.mockResolvedValue(pendingArticle as never);
    mockUserRepo.findById.mockResolvedValue({ name: 'Author Person', email: 'author@example.com' });

    const result = await service.getArticleForReview(articleId);

    expect(mockArticleRepo.findById).toHaveBeenCalledWith(articleId);
    expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      ...pendingArticle,
      authorName: 'Author Person',
      authorEmail: 'author@example.com',
    });
  });

  it('should fall back to Unknown and null for author when user is not found', async () => {
    const pendingArticle = {
      id: articleId,
      title: 'Pending Article Title',
      status: 'Pending',
      authorId: 'user-missing',
    };

    mockArticleRepo.findById.mockResolvedValue(pendingArticle as never);
    mockUserRepo.findById.mockResolvedValue(null);

    const result = await service.getArticleForReview(articleId);

    expect(result).toEqual({
      ...pendingArticle,
      authorName: 'Unknown',
      authorEmail: null,
    });
  });

  it('should throw 404 when article does not exist', async () => {
    mockArticleRepo.findById.mockResolvedValue(null);

    await expect(service.getArticleForReview(articleId))
      .rejects.toThrow(new AppError('Article not found', 404));

    expect(mockArticleRepo.findById).toHaveBeenCalledWith(articleId);
  });

  it.each(['Draft', 'Published', 'Unpublished', 'Rejected'] as const)(
    'should throw 400 when article status is %s',
    async (status) => {
      mockArticleRepo.findById.mockResolvedValue({
        id: articleId,
        status,
        authorId: 'user-1',
      } as never);

      await expect(service.getArticleForReview(articleId))
        .rejects.toThrow(new AppError('Only Pending articles can be reviewed', 400));
    }
  );
});
