import { prisma, ReviewStatus, ReviewCommentStatus } from '@repo/db';
import type {
  ArticleReview,
  CreateArticleReviewInput,
} from '@models/article.types.js';

const ARTICLE_REVIEW_SELECT = {
  id: true,
  articleId: true,
  reviewerId: true,
  status: true,
  feedback: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class ArticleReviewRepository {
  async findLatestByArticleId(
    articleId: string
  ): Promise<ArticleReview | null> {
    const result = await prisma.articleReview.findFirst({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
      select: ARTICLE_REVIEW_SELECT,
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      articleId: result.articleId,
      reviewerId: result.reviewerId,
      reviewStatus: result.status,
      comments: result.feedback ?? undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async findById(id: string): Promise<ArticleReview | null> {
    const result = await prisma.articleReview.findUnique({
      where: { id },
      select: ARTICLE_REVIEW_SELECT,
    });
    if (!result) return null;
    return {
      id: result.id,
      articleId: result.articleId,
      reviewerId: result.reviewerId,
      reviewStatus: result.status,
      comments: result.feedback ?? undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async create(data: CreateArticleReviewInput): Promise<ArticleReview> {
    const result = await prisma.articleReview.create({
      data: {
        articleId: data.articleId,
        reviewerId: data.reviewerId,
        status: data.status,
        feedback: data.feedback,
        createdBy: data.createdBy,
      },
      select: ARTICLE_REVIEW_SELECT,
    });

    return {
      id: result.id,
      articleId: result.articleId,
      reviewerId: result.reviewerId,
      reviewStatus: result.status,
      comments: result.feedback ?? undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async findPendingWithComments(articleId: string) {
    const result = await prisma.articleReview.findFirst({
      where: { articleId, status: ReviewStatus.Pending },
      include: {
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      articleId: result.articleId,
      reviewerId: result.reviewerId,
      status: result.status as ReviewStatus,
      feedback: result.feedback,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      comments: result.comments.map(c => ({
        id: c.id,
        reviewId: c.reviewId,
        comment: c.comment,
        selectedText: c.selectedText,
        anchorData: c.anchorData,
        status: c.status as ReviewCommentStatus,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  }

  async updateStatus(
    id: string,
    status: ReviewStatus,
    feedback: string | null,
    reviewerId: string
  ): Promise<ArticleReview> {
    const result = await prisma.articleReview.update({
      where: { id },
      data: {
        status,
        feedback,
        reviewerId,
      },
      select: ARTICLE_REVIEW_SELECT,
    });

    return {
      id: result.id,
      articleId: result.articleId,
      reviewerId: result.reviewerId,
      reviewStatus: result.status,
      comments: result.feedback ?? undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}

export default new ArticleReviewRepository();
