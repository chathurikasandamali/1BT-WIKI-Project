import { apiFetch } from '@/lib/api/client';
import type { UserRole } from '@repo/shared';

export interface DashboardSummary {
  totalUsers: number;
  publishedArticles: number;
  pendingReviews: number;
  approvals: number;
  techTalks: number;
}

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean | null;
  image: string | null;
  createdAt: string;
}

/**
 * Admin Home widget counts (`GET /admin/dashboard`).
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const result = await apiFetch<DashboardSummary>('/admin/dashboard');
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load dashboard summary');
  }
  return result.data;
}

/**
 * Newest registered users for the Admin Home preview list.
 * Uses the existing admin user list endpoint and slices client-side because
 * that API does not paginate.
 */
export async function fetchDashboardUsers(limit: number): Promise<DashboardUser[]> {
  const result = await apiFetch<DashboardUser[]>('/admin/getAllUsers');
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load users');
  }

  return [...result.data]
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    )
    .slice(0, limit);
}
