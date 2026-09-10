import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('@repo/db', () => ({
  ReviewStatus: { Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected' },
  ReviewCommentStatus: { Open: 'Open', Resolved: 'Resolved' },
  prisma: {
    articleReview: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { prisma } = await import('@repo/db');
const prismaMock = jest.mocked(prisma);
const { default: ArticleReviewRepository } = await import('../articleReviewRepository.js');

describe('ArticleReviewRepository', () => {
  const articleId = 'article-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findLatestWithComments', () => {
    it('should return null when no review exists for articleId', async () => {
      prismaMock.articleReview.findFirst.mockResolvedValue(null as never);

      const result = await ArticleReviewRepository.findLatestWithComments(articleId);

      expect(prisma.articleReview.findFirst).toHaveBeenCalledWith({
        where: { articleId },
        orderBy: { createdAt: 'desc' },
        include: {
          comments: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(result).toBeNull();
    });

    it('should return mapped latest review with comments when review exists', async () => {
      const mockDbResult = {
        id: 'review-123',
        articleId,
        reviewerId: 'reviewer-1',
        status: 'Rejected',
        feedback: 'Overall rejection notes',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        comments: [
          {
            id: 'comment-1',
            reviewId: 'review-123',
            comment: 'Inline note',
            selectedText: 'selected text',
            anchorData: {},
            status: 'Open',
            createdBy: 'reviewer-1',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          },
        ],
      };

      prismaMock.articleReview.findFirst.mockResolvedValue(mockDbResult as never);

      const result = await ArticleReviewRepository.findLatestWithComments(articleId);

      expect(result).toEqual({
        id: 'review-123',
        articleId,
        reviewerId: 'reviewer-1',
        reviewStatus: 'Rejected',
        feedback: 'Overall rejection notes',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        comments: [
          {
            id: 'comment-1',
            reviewId: 'review-123',
            comment: 'Inline note',
            selectedText: 'selected text',
            anchorData: {},
            status: 'Open',
            createdBy: 'reviewer-1',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          },
        ],
      });
    });
  });
});
