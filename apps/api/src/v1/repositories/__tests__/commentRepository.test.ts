import { jest } from '@jest/globals';

jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    comment: {
      update: jest.fn(),
    },
  },
}));

const { prisma } = await import('@repo/db');
const prismaMock = jest.mocked(prisma);
const { default: CommentRepository } = await import('../commentRepository.js');

describe('CommentRepository.reject', () => {
  const commentId = 'comment-123';
  const reviewerId = 'admin-1';
  const reason = 'This comment violates community guidelines';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update status, reviewer fields, and persist the rejection reason', async () => {
    const updated = {
      id: commentId,
      articleId: 'article-123',
      createdBy: 'user-1',
      body: 'Some comment',
      status: 'Rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date('2026-01-01'),
      rejectionReason: reason,
      createdAt: new Date('2025-12-31'),
      updatedAt: new Date('2026-01-01'),
    };
    prismaMock.comment.update.mockResolvedValue(updated as any);

    const result = await CommentRepository.reject(commentId, reviewerId, reason);

    expect(prisma.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: commentId },
        data: expect.objectContaining({
          status: 'Rejected',
          reviewedBy: reviewerId,
          rejectionReason: reason,
        }),
      })
    );
    expect(result).toEqual(updated);
  });
});
