import {
  AdminDashboardRepository,
  adminDashboardRepository as adminDashboardRepositoryInstance,
} from '@repositories/adminDashboardRepository.js';
import type { DashboardSummary } from '@models/adminDashboard.types.js';

export class AdminDashboardService {
  constructor(
    private readonly adminDashboardRepository: AdminDashboardRepository = adminDashboardRepositoryInstance
  ) {}

  /**
   * Returns the Admin Home widget counts. Aggregation lives in the repository
   * so this service stays a thin, testable pass-through.
   */
  async getSummary(): Promise<DashboardSummary> {
    return this.adminDashboardRepository.getAggregatedStats();
  }
}

export const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;
