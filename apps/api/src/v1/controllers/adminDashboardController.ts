import type { Request, Response, NextFunction } from 'express';
import {
  AdminDashboardService,
  adminDashboardService as adminDashboardServiceInstance,
} from '@services/adminDashboardService.js';
import { successResponse } from '@/types/userTypes.js';
import { HttpStatusCode } from '@utils/httpStatus.js';

export class AdminDashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService = adminDashboardServiceInstance
  ) {}

  /**
   * GET /api/v1/admin/dashboard — Admin Home widget counts.
   */
  getSummary = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const summary = await this.adminDashboardService.getSummary();
      res
        .status(HttpStatusCode.OK)
        .json(
          successResponse(summary, 'Dashboard summary retrieved successfully')
        );
    } catch (error) {
      next(error);
    }
  };
}

export const adminDashboardController = new AdminDashboardController();
export default adminDashboardController;
