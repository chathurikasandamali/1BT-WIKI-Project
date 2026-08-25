import type { Request, Response, NextFunction } from 'express';
import { ReviewerService } from '@services/reviewerService.js';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } from '@repo/shared';

export class ReviewerController {
  constructor(private service: ReviewerService = new ReviewerService()) {}

  listPending = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = Number(req.query.page) || DEFAULT_PAGE;
      const limit = Number(req.query.limit) || DEFAULT_PAGE_LIMIT;
      const result = await this.service.listPending(page, limit);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Pending articles retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  approveArticle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const reviewerId = req.user!.userId;
      const article = await this.service.approveArticle(id, reviewerId);
      res.status(200).json({
        success: true,
        data: article,
        message: 'Article approved and published',
      });
    } catch (error) {
      next(error);
    }
  };

  rejectArticle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { feedback } = req.body as { feedback?: string };
      const reviewerId = req.user!.userId;
      const article = await this.service.rejectArticle(
        id,
        reviewerId,
        feedback ?? ''
      );
      res
        .status(200)
        .json({ success: true, data: article, message: 'Article rejected' });
    } catch (error) {
      next(error);
    }
  };

  getArticleForReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const article = await this.service.getArticleForReview(id);
      res.status(200).json({ success: true, data: article, message: 'Article retrieved for review' });
    } catch (error) {
      next(error);
    }
  };

  createComment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { articleId } = req.params;
      const { comment, selectedText, anchorData } = req.body as {
        comment?: string;
        selectedText?: string | null;
        anchorData?: unknown;
      };
      const reviewerId = req.user!.userId;

      const result = await this.service.createComment(
        articleId,
        reviewerId,
        comment ?? '',
        selectedText ?? null,
        anchorData
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Review comment created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  updateCommentStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { articleId, commentId } = req.params;
      const { status } = req.body as { status?: any };
      const reviewerId = req.user!.userId;

      const result = await this.service.updateCommentStatus(
        articleId,
        commentId,
        reviewerId,
        status
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Review comment status updated successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new ReviewerController();
