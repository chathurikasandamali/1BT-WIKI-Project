import { ArticleRepository } from '@repositories/articleRepository.js';
import { ArticleReviewRepository } from '@repositories/articleReviewRepository.js';
import UserRepository from '@repositories/userRepository.js';
import { AppError } from '@errors/AppError.js';
import type { Article, ArticleReviewComment } from '@models/article.types.js';
import { ReviewStatus, ArticleStatus, ReviewCommentStatus } from '@repo/db';
import notificationService from '@services/notificationService.js';
import defaultQuizService, { type QuizService } from '@services/quizService.js';
import { NotificationBuilder } from '@v1/lib/NotificationBuilder.js';
import articleReviewCommentRepository, { ArticleReviewCommentRepository } from '@repositories/articleReviewCommentRepository.js';
import { HttpStatusCode } from '@utils/httpStatus.js';

export class ReviewerService {
  constructor(
    private readonly articleRepository: ArticleRepository = new ArticleRepository(),
    private readonly reviewRepository: ArticleReviewRepository = new ArticleReviewRepository(),
    private readonly userRepository: typeof UserRepository = UserRepository,
    private readonly quizService: QuizService = defaultQuizService,
    private readonly commentRepository: ArticleReviewCommentRepository = articleReviewCommentRepository,
  ) {}

  async listPending(
    page: number = 1,
    limit: number = 20
  ): Promise<{ articles: (Article & { authorName: string; authorEmail: string | null })[]; total: number; page: number; limit: number }> {
    const { articles, total } = await this.articleRepository.findByStatus(
      ArticleStatus.Pending,
      page,
      limit
    );

    // TODO: batch via a findManyByIds if UserRepository adds one, to avoid N+1 queries on larger pending lists
    const enrichedArticles = await Promise.all(
      articles.map(async (article) => {
        const author = await this.userRepository.findById(article.authorId);
        return {
          ...article,
          authorName: author?.name ?? 'Unknown',
          authorEmail: author?.email ?? null,
        };
      })
    );

    return { articles: enrichedArticles, total, page, limit };
  }

  async approveArticle(
    articleId: string,
    reviewerId: string
  ): Promise<Article> {
    const article = await this.articleRepository.findById(articleId);
    if (!article) throw new AppError('Article not found', HttpStatusCode.NOT_FOUND);
    if (article.status !== ArticleStatus.Pending) {
      throw new AppError('Only Pending articles can be approved', HttpStatusCode.BAD_REQUEST);
    }

    const approved = await this.articleRepository.updateStatus(
      articleId,
      ArticleStatus.Published
    );

    const pendingReview = await this.reviewRepository.findPendingWithComments(articleId);
    if (pendingReview) {
      await this.reviewRepository.updateStatus(
        pendingReview.id,
        ReviewStatus.Approved,
        null,
        reviewerId
      );
    } else {
      await this.reviewRepository.create({
        articleId,
        reviewerId,
        status: ReviewStatus.Approved,
        feedback: null,
        createdBy: reviewerId,
      });
    }

    // Notify the author that their article has been approved and published.
    // Fire-and-forget — a notification failure must not roll back the approval.
    const notificationPayload = new NotificationBuilder()
      .forUser(article.authorId)
      .regardingArticle(articleId)
      .withSuccess(
        'Article Approved',
        `Your article "${article.title}" has been approved and is now published.`
      )
      .build();

    notificationService.send(notificationPayload).catch((err: unknown) => {
      console.error(
        '[NotificationService] Failed to send approval notification:',
        err
      );
    });

    // Pre-generate a fallback quiz for the newly published article.
    // Fire-and-forget — quiz generation must not block or roll back the approval.
    this.quizService.pregenerateFallbackQuiz(articleId).catch((err: unknown) => {
      console.error(
        '[QuizService] Failed to pre-generate fallback quiz:',
        err
      );
    });

    return approved;
  }

  async rejectArticle(
    articleId: string,
    reviewerId: string,
    feedback: string
  ): Promise<Article> {
    if (!feedback || feedback.trim().length < 10) {
      throw new AppError(
        'Rejection feedback must be at least 10 characters',
        HttpStatusCode.BAD_REQUEST
      );
    }

    const article = await this.articleRepository.findById(articleId);
    if (!article) throw new AppError('Article not found', HttpStatusCode.NOT_FOUND);
    if (article.status !== ArticleStatus.Pending) {
      throw new AppError('Only Pending articles can be rejected', HttpStatusCode.BAD_REQUEST);
    }

    const rejected = await this.articleRepository.updateStatus(
      articleId,
      ArticleStatus.Draft
    );

    const pendingReview = await this.reviewRepository.findPendingWithComments(articleId);
    if (pendingReview) {
      await this.reviewRepository.updateStatus(
        pendingReview.id,
        ReviewStatus.Rejected,
        feedback.trim(),
        reviewerId
      );
    } else {
      await this.reviewRepository.create({
        articleId,
        reviewerId,
        status: ReviewStatus.Rejected,
        feedback: feedback.trim(),
        createdBy: reviewerId,
      });
    }

    // Notify the author that their article has been rejected, including feedback.
    // Fire-and-forget — a notification failure must not roll back the rejection.
    const notificationPayload = new NotificationBuilder()
      .forUser(article.authorId)
      .regardingArticle(articleId)
      .withFailure(
        'Article Rejected',
        `Your article "${article.title}" was rejected. Feedback: ${feedback.trim()}`
      )
      .build();

    notificationService.send(notificationPayload).catch((err: unknown) => {
      console.error(
        '[NotificationService] Failed to send rejection notification:',
        err
      );
    });

    return rejected;
  }

  async getArticleForReview(articleId: string): Promise<{
    article: Article & { authorName: string; authorEmail: string | null };
    review: {
      id: string;
      status: string;
      feedback: string | null;
      comments: ArticleReviewComment[];
    } | null;
  }> {
    const article = await this.articleRepository.findById(articleId);
    if (!article) throw new AppError('Article not found', HttpStatusCode.NOT_FOUND);
    if (article.status !== 'Pending') {
      throw new AppError('Only Pending articles can be reviewed', HttpStatusCode.BAD_REQUEST);
    }

    const author = await this.userRepository.findById(article.authorId);
    const pendingReview = await this.reviewRepository.findPendingWithComments(articleId);

    return {
      article: {
        ...article,
        authorName: author?.name ?? 'Unknown',
        authorEmail: author?.email ?? null,
      },
      review: pendingReview,
    };
  }

  async createComment(
    articleId: string,
    reviewerId: string,
    commentText: string,
    selectedText: string | null,
    anchorData: unknown
  ): Promise<ArticleReviewComment> {
    if (!commentText || commentText.trim() === '') {
      throw new AppError('Comment cannot be empty', HttpStatusCode.BAD_REQUEST);
    }

    const article = await this.articleRepository.findById(articleId);
    if (!article) throw new AppError('Article not found', HttpStatusCode.NOT_FOUND);
    if (article.status !== ArticleStatus.Pending) {
      throw new AppError('Only Pending articles can be commented on', HttpStatusCode.BAD_REQUEST);
    }

    let pendingReview = await this.reviewRepository.findPendingWithComments(articleId);
    let reviewId = pendingReview?.id;

    if (!reviewId) {
      const newReview = await this.reviewRepository.create({
        articleId,
        reviewerId,
        status: ReviewStatus.Pending,
        feedback: null,
        createdBy: reviewerId,
      });
      reviewId = newReview.id;
    }

    const comment = await this.commentRepository.create({
      reviewId,
      comment: commentText,
      selectedText,
      anchorData,
      createdBy: reviewerId,
    });

    return comment;
  }

  async updateCommentStatus(
    articleId: string,
    commentId: string,
    reviewerId: string,
    status: ReviewCommentStatus
  ): Promise<ArticleReviewComment> {
    if (status !== ReviewCommentStatus.Open && status !== ReviewCommentStatus.Resolved) {
      throw new AppError('Invalid status. Allowed: Open, Resolved', HttpStatusCode.BAD_REQUEST);
    }

    const comment = await this.commentRepository.findByIdWithReview(commentId);
    if (!comment) throw new AppError('Comment not found', HttpStatusCode.NOT_FOUND);

    if (comment.review.articleId !== articleId) {
      throw new AppError('Comment does not belong to this article review', HttpStatusCode.BAD_REQUEST);
    }

    return this.commentRepository.updateStatus(commentId, status);
  }
}

export default new ReviewerService();
