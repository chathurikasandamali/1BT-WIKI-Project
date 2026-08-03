import type { Request, Response, NextFunction } from 'express';
import { E2eCleanupService } from '../services/e2eCleanupService.js';

export class E2eController {
  private e2eCleanupService: E2eCleanupService;

  constructor(e2eCleanupService = new E2eCleanupService()) {
    this.e2eCleanupService = e2eCleanupService;
  }

  deleteArticle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const result = await this.e2eCleanupService.deleteArticle(id, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: result.alreadyAbsent 
          ? 'Article is already absent' 
          : 'E2E article and dependencies successfully deleted',
      });
    } catch (error) {
      next(error);
    }
  };
}
