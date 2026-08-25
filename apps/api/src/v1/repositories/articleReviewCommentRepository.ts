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
      id: result.id,
      reviewId: result.reviewId,
      comment: result.comment,
      selectedText: result.selectedText,
      anchorData: result.anchorData,
      status: result.status as ReviewCommentStatus,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async findByReviewId(reviewId: string): Promise<ArticleReviewComment[]> {
    const results = await prisma.articleReviewComment.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    });
    return results.map((result) => ({
      id: result.id,
      reviewId: result.reviewId,
      comment: result.comment,
      selectedText: result.selectedText,
      anchorData: result.anchorData,
      status: result.status as ReviewCommentStatus,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));
  }

  async create(data: CreateReviewCommentInput): Promise<ArticleReviewComment> {
    const result = await prisma.articleReviewComment.create({
      data: {
        reviewId: data.reviewId,
        comment: data.comment,
        selectedText: data.selectedText ?? null,
        anchorData: data.anchorData as Prisma.InputJsonValue,
        createdBy: data.createdBy,
        status: ReviewCommentStatus.Open,
      },
    });
    return {
      id: result.id,
      reviewId: result.reviewId,
      comment: result.comment,
      selectedText: result.selectedText,
      anchorData: result.anchorData,
      status: result.status as ReviewCommentStatus,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async updateStatus(id: string, status: ReviewCommentStatus): Promise<ArticleReviewComment> {
    const result = await prisma.articleReviewComment.update({
      where: { id },
      data: { status },
    });
    return {
      id: result.id,
      reviewId: result.reviewId,
      comment: result.comment,
      selectedText: result.selectedText,
      anchorData: result.anchorData,
      status: result.status as ReviewCommentStatus,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}

export default new ArticleReviewCommentRepository();
