import type { Request, Response, NextFunction } from 'express';
import { ReviewerService } from '@services/reviewerService.js';

export class ReviewerController {
  constructor(private service: ReviewerService = new ReviewerService()) {}

  listPending = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
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
}

export default new ReviewerController();
