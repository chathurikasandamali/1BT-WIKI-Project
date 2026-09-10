import { prisma, ReviewCommentStatus } from '@repo/db';
import type { Prisma } from '@repo/db';
import type {
  ArticleReviewComment,
  CreateReviewCommentInput,
} from '@models/article.types.js';

export class ArticleReviewCommentRepository {
  async findById(id: string): Promise<ArticleReviewComment | null> {
    const result = await prisma.articleReviewComment.findUnique({
      where: { id },
    });

    if (!result) return null;

    return {
      ...result,
      status: result.status as ReviewCommentStatus,
    };
  }

  async findByReviewId(reviewId: string): Promise<ArticleReviewComment[]> {
    const results = await prisma.articleReviewComment.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    });
    return results.map((result) => ({
      ...result,
      status: result.status as ReviewCommentStatus,
    }));
  }

  async create(data: CreateReviewCommentInput): Promise<ArticleReviewComment> {
    const result = await prisma.articleReviewComment.create({
      data: {
        ...data,
        anchorData: data.anchorData as Prisma.InputJsonValue,
      },
    });
    return {
      ...result,
      status: result.status as ReviewCommentStatus,
    };
  }

  async updateStatus(id: string, status: ReviewCommentStatus): Promise<ArticleReviewComment> {
    const result = await prisma.articleReviewComment.update({
      where: { id },
      data: { status },
    });
    return {
      ...result,
      status: result.status as ReviewCommentStatus,
    };
  }

  async findByIdWithReview(commentId: string): Promise<(ArticleReviewComment & { review: { articleId: string } }) | null> {
    const result = await prisma.articleReviewComment.findUnique({
      where: { id: commentId },
      include: {
        review: {
          select: {
            articleId: true,
          },
        },
      },
    });

    if (!result) return null;

    return {
      ...result,
      status: result.status as ReviewCommentStatus,
    };
  }

  async countByReviewIds(reviewIds: string[]): Promise<Map<string, number>> {
    if (reviewIds.length === 0) return new Map();

    const counts = await prisma.articleReviewComment.groupBy({
      by: ['reviewId'],
      where: {
        reviewId: { in: reviewIds },
      },
      _count: {
        _all: true,
      },
    });

    const map = new Map<string, number>();
    for (const c of counts) {
      map.set(c.reviewId, c._count._all);
    }
    return map;
  }
}

export default new ArticleReviewCommentRepository();
