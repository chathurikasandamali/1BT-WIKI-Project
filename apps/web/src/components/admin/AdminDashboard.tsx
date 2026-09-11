'use client';

import React from 'react';
import {
  fetchDashboardSummary,
  fetchDashboardUsers,
  type DashboardSummary,
  type DashboardUser,
} from '@/lib/api/adminDashboard';
import { fetchAllArticles, type AdminArticleListItem } from '@/lib/api/articles';
import { listAll, type TechTalkListItem } from '@/lib/api/techTalks';
import {
  listPending,
  type PendingArticleListItem,
} from '@/lib/api/reviewer.api';
import { useAsync } from '@/lib/hooks/useAsync';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { DashboardSection } from '@/components/admin/DashboardSection';
import { DashboardUserPreview } from '@/components/admin/DashboardUserPreview';
import { DashboardArticlePreview } from '@/components/admin/DashboardArticlePreview';
import { DashboardTechTalkPreview } from '@/components/admin/DashboardTechTalkPreview';
import { DashboardPendingReviewPreview } from '@/components/admin/DashboardPendingReviewPreview';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { FileIcon } from '@/components/shared/icons/FileIcon';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { PageLoader } from '@/components/shared/PageLoader';

const PREVIEW_LIMIT = 4;

interface DashboardWidgetConfig {
  label: string;
  description: string;
  value: number;
  href: string;
  icon: React.ReactNode;
  testId: string;
  valueClassName?: string;
  iconClassName?: string;
  borderClassName?: string;
  highlight?: boolean;
}

/**
 * Builds Admin Home statistic tiles sorted A–Z by title.
 */
function getDashboardWidgets(summary: DashboardSummary): DashboardWidgetConfig[] {
  const widgets: DashboardWidgetConfig[] = [
    {
      label: 'Registered users',
      description: 'People with access to the wiki',
      value: summary.totalUsers,
      href: '/admin/users',
      icon: <UsersIcon className="h-4 w-4" />,
      testId: 'widget-total-users',
    },
    {
      label: 'Published articles',
      description: 'Live articles on the homepage',
      value: summary.publishedArticles,
      href: '/admin/articles',
      icon: <ArticleIcon className="h-4 w-4" />,
      valueClassName: 'text-green-600',
      iconClassName: 'bg-green-50 text-green-700',
      borderClassName: 'border-green-200',
      testId: 'widget-published-articles',
    },
    {
      label: 'Pending reviews',
      description: 'Articles waiting for a reviewer',
      value: summary.pendingReviews,
      href: '/reviewer/approvals',
      icon: <FileIcon className="h-4 w-4" strokeWidth={2} />,
      valueClassName: 'text-amber-600',
      iconClassName: 'bg-amber-50 text-amber-700',
      borderClassName: 'border-amber-200',
      highlight: summary.pendingReviews > 0,
      testId: 'widget-pending-reviews',
    },
    {
      label: 'Approvals',
      description: 'Approved and ready to publish',
      value: summary.approvals,
      href: '/admin/articles',
      icon: <CheckCircleIcon className="h-4 w-4" />,
      valueClassName: 'text-blue-600',
      iconClassName: 'bg-blue-50 text-blue-700',
      borderClassName: 'border-blue-200',
      testId: 'widget-approvals',
    },
    {
      label: 'Tech Talks',
      description: 'Talks across every status',
      value: summary.techTalks,
      href: '/admin/tech-talks',
      icon: <TechTalkIcon className="h-4 w-4" />,
      testId: 'widget-tech-talks',
    },
  ];

  return widgets.sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
  );
}

interface AdminDashboardData {
  summary: DashboardSummary;
  users: DashboardUser[];
  articles: AdminArticleListItem[];
  techTalks: TechTalkListItem[];
  pendingReviews: PendingArticleListItem[];
}

async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const [summary, users, articleResult, techTalkResult, pendingResult] =
    await Promise.all([
      fetchDashboardSummary(),
      fetchDashboardUsers(PREVIEW_LIMIT),
      fetchAllArticles({
        page: 1,
        limit: PREVIEW_LIMIT,
        sort: 'createdAt',
        order: 'desc',
      }),
      listAll({
        page: 1,
        limit: PREVIEW_LIMIT,
        sort: 'eventDate',
        order: 'desc',
      }),
      listPending(1, PREVIEW_LIMIT),
    ]);

  return {
    summary,
    users,
    articles: articleResult.articles,
    techTalks: techTalkResult.techTalks,
    pendingReviews: pendingResult.articles,
  };
}

/**
 * Admin Home: summary widgets plus short previews of users, articles,
 * Tech Talks, and pending reviews.
 */
export function AdminDashboard(): React.JSX.Element {
  const { data, loading, error } = useAsync(fetchAdminDashboardData, []);

  const summary = data?.summary;
  const users = data?.users ?? [];
  const articles = data?.articles ?? [];
  const techTalks = data?.techTalks ?? [];
  const pendingReviews = data?.pendingReviews ?? [];

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-6xl p-8" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-text-primary">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-brand-text-secondary">
          A snapshot of people, articles, reviews, and Tech Talks across 1BT Wiki.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red"
          role="alert"
          data-testid="admin-dashboard-error"
        >
          {error}
        </div>
      )}

      {!error && summary && (
        <div
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
          data-testid="admin-dashboard-widgets"
        >
          {getDashboardWidgets(summary).map((widget) => (
            <DashboardWidget key={widget.testId} {...widget} />
          ))}
        </div>
      )}

      {!error && (
        <div className="flex flex-col gap-6">
          <DashboardSection
            title="Users"
            description="Most recently registered accounts"
            showMoreHref="/admin/users"
            testId="dashboard-users-section"
          >
            <DashboardUserPreview users={users} loading={false} />
          </DashboardSection>

          <DashboardSection
            title="Articles"
            description="Latest articles across every status"
            showMoreHref="/admin/articles"
            testId="dashboard-articles-section"
          >
            <DashboardArticlePreview articles={articles} loading={false} />
          </DashboardSection>

          <DashboardSection
            title="Tech Talks"
            description="Latest talks from the publishing calendar"
            showMoreHref="/admin/tech-talks"
            testId="dashboard-techtalks-section"
          >
            <DashboardTechTalkPreview techTalks={techTalks} loading={false} />
          </DashboardSection>

          <DashboardSection
            title="Pending reviews"
            description="Articles waiting for admin or reviewer approval"
            showMoreHref="/reviewer/approvals"
            testId="dashboard-pending-reviews-section"
          >
            <DashboardPendingReviewPreview
              articles={pendingReviews}
              loading={false}
            />
          </DashboardSection>
        </div>
      )}
    </div>
  );
}
