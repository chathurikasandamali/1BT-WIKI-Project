'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRoleValue } from '@repo/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { usePendingArticles } from '@/lib/hooks/useReviewer';
import { formatDate } from '@/lib/utils/date';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { EyeIcon } from '@/components/shared/icons/EyeIcon';

function ReviewerApprovalsContent(): React.JSX.Element {
  const { articles, loading, error } = usePendingArticles();
  const [search, setSearch] = useState('');

  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return articles;
    }
    return articles.filter((article) => {
      const titleMatch = article.title.toLowerCase().includes(query);
      const authorMatch = article.authorName.toLowerCase().includes(query);
      return titleMatch || authorMatch;
    });
  }, [articles, search]);

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div
        className="rounded border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red"
        data-testid="pending-articles-error"
      >
        {error}
      </div>
    );
  }

  const isListEmpty = articles.length === 0;
  const hasNoMatches = !isListEmpty && visibleArticles.length === 0;

  let emptyTitle = 'No articles pending approval.';
  let emptyDescription =
    'New submissions will appear here when authors send an article for review.';
  if (hasNoMatches) {
    emptyTitle = 'No pending articles match your search.';
    emptyDescription = 'Try a different title or author name.';
  }

  return (
    <div className="mx-auto max-w-6xl p-8" data-testid="reviewer-approvals-page">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-text-primary">
          Reviewer Approvals
        </h1>
        <p className="mt-1 text-sm text-brand-text-secondary">
          Review and approve or reject pending article submissions.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardWidget
          label="Pending review"
          description="Articles waiting for a decision"
          value={articles.length}
          icon={<ArticleIcon className="h-4 w-4" />}
          valueClassName="text-amber-600"
          iconClassName="bg-amber-50 text-amber-700"
          borderClassName="border-amber-200"
          highlight={articles.length > 0}
          testId="widget-pending-approvals"
        />
      </div>

      <section className="overflow-visible rounded border border-brand-border bg-brand-surface shadow-sm">
        <div className="border-b border-brand-border bg-brand-bg/40 px-4 py-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-brand-text-primary">
              Pending articles
            </h2>
            <p className="mt-0.5 text-xs text-brand-text-secondary">
              Open an article to read the full submission and leave a decision.
            </p>
          </div>
          <div className="relative min-w-0 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon className="h-4 w-4 text-brand-text-secondary" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or author"
              data-testid="approvals-search-input"
              className="w-full rounded border border-brand-border bg-brand-surface py-2.5 pl-9 pr-3 text-sm text-brand-text-primary transition-colors placeholder:text-brand-text-secondary focus:border-brand-red focus:outline-none"
            />
          </div>
        </div>

        {(isListEmpty || hasNoMatches) && (
          <EmptyState
            testId="pending-articles-empty"
            title={emptyTitle}
            description={emptyDescription}
            icon={<ArticleIcon className="h-6 w-6" />}
          />
        )}

        {!isListEmpty && !hasNoMatches && (
          <div className="flex flex-col gap-3 p-4" data-testid="pending-articles-list">
            {visibleArticles.map((article) => (
              <div
                key={article.id}
                className="flex flex-col justify-between gap-4 rounded border border-brand-border bg-brand-surface p-4 sm:flex-row sm:items-center"
                data-testid={`article-card-${article.id}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge status={article.status} />
                    <span className="text-xs text-brand-text-secondary">
                      Submitted: {formatDate(article.updatedAt)}
                    </span>
                  </div>
                  <h2 className="truncate text-base font-semibold text-brand-text-primary">
                    {article.title}
                  </h2>
                  <p className="mt-1 text-xs text-brand-text-secondary">
                    Author:{' '}
                    <span className="font-medium text-brand-text-primary">
                      {article.authorName}
                    </span>
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <Link
                    href={`/reviewer/approvals/${article.id}`}
                    data-testid={`view-article-${article.id}`}
                    className="flex items-center gap-1.5 rounded bg-brand-red px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-red/90"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ReviewerApprovalsPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[UserRoleValue.Reviewer, UserRoleValue.Admin]}>
      <ReviewerApprovalsContent />
    </RoleGuard>
  );
}
