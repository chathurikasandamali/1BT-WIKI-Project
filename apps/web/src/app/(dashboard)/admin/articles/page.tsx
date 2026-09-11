'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRoleValue } from '@repo/shared';
import {
  fetchAllArticles,
  type AdminArticleListItem,
  type AdminArticleStatusFilter,
} from '@/lib/api/articles';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageLoader } from '@/components/shared/PageLoader';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { FilterChip } from '@/components/admin/FilterChip';
import { SortableHeader } from '@/components/admin/SortableHeader';
import { formatDate } from '@/lib/utils/date';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { RefreshIcon } from '@/components/shared/icons/RefreshIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { FileIcon } from '@/components/shared/icons/FileIcon';
import { BanIcon } from '@/components/shared/icons/BanIcon';

gsap.registerPlugin(useGSAP);

type SortField = 'title' | 'createdAt' | 'views';
type SortDir = 'asc' | 'desc';
type ArticleStatusFilter = AdminArticleStatusFilter | 'All';

const STATUS_FILTERS: ArticleStatusFilter[] = [
  'All',
  'Pending',
  'Approved',
  'Published',
  'Unpublished',
];

const PAGE_SIZE = 12;

function ArticleManagementContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ArticleStatusFilter>('All');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<
    'All' | 'Published' | 'Pending' | 'Approved' | 'Unpublished',
    number
  > | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllArticles({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        sort: sortField,
        order: sortDir,
      });
      setArticles(result.articles);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, sortField, sortDir]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const loadStatusCounts = useCallback(async () => {
    try {
      const [all, published, pending, approved, unpublished] =
        await Promise.all([
          fetchAllArticles({ page: 1, limit: 1 }),
          fetchAllArticles({ page: 1, limit: 1, status: 'Published' }),
          fetchAllArticles({ page: 1, limit: 1, status: 'Pending' }),
          fetchAllArticles({ page: 1, limit: 1, status: 'Approved' }),
          fetchAllArticles({ page: 1, limit: 1, status: 'Unpublished' }),
        ]);
      setStatusCounts({
        All: all.total,
        Published: published.total,
        Pending: pending.total,
        Approved: approved.total,
        Unpublished: unpublished.total,
      });
    } catch {
      setStatusCounts(null);
    }
  }, []);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts]);

  useGSAP(
    () => {
      if (!loading && !error && containerRef.current) {
        gsap.fromTo(
          '.page-header',
          { y: -10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
        gsap.fromTo(
          '.table-card',
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', delay: 0.08 }
        );
        gsap.fromTo(
          '.article-row',
          { x: -8, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.3,
            stagger: 0.04,
            ease: 'power2.out',
            delay: 0.18,
          }
        );
      }
    },
    { scope: containerRef, dependencies: [loading, error] }
  );

  const applyStatusFilter = (status: ArticleStatusFilter): void => {
    setStatusFilter(status);
    setPage(1);
  };

  const toggleSort = (field: SortField): void => {
    setPage(1);
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isInitialLoad = loading && articles.length === 0 && !error;

  if (isInitialLoad) {
    return <PageLoader testId="loading-state" message="Loading articles" />;
  }

  return (
    <div className="mx-auto max-w-6xl p-8" ref={containerRef}>
      <div className="page-header mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            Article Management
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Browse and inspect articles across every status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadArticles();
            loadStatusCounts();
          }}
          data-testid="refresh-btn"
          disabled={loading}
          className="flex items-center gap-2 self-start rounded border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-hover disabled:opacity-50 sm:self-auto"
        >
          <RefreshIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="mb-6 flex items-center justify-between rounded border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red"
          data-testid="error-banner"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-lg leading-none text-brand-red hover:text-brand-red-hover"
          >
            ×
          </button>
        </div>
      )}

      {!error && statusCounts && (
        <div className="page-header mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardWidget
            label="Total Articles"
            description="Articles across every status"
            value={statusCounts.All}
            onClick={() => applyStatusFilter('All')}
            selected={statusFilter === 'All'}
            icon={<ArticleIcon className="h-4 w-4" />}
            borderClassName="border-brand-border"
            testId="total-articles-stat"
          />
          <DashboardWidget
            label="Published"
            description="Live on the homepage"
            value={statusCounts.Published}
            onClick={() => applyStatusFilter('Published')}
            selected={statusFilter === 'Published'}
            icon={<CheckCircleIcon className="h-4 w-4" />}
            valueClassName="text-green-600"
            iconClassName="bg-green-50 text-green-700"
            borderClassName="border-green-200"
            testId="published-articles-stat"
          />
          <DashboardWidget
            label="Pending"
            description="Waiting for review"
            value={statusCounts.Pending}
            onClick={() => applyStatusFilter('Pending')}
            selected={statusFilter === 'Pending'}
            icon={<FileIcon className="h-4 w-4" strokeWidth={2} />}
            valueClassName="text-amber-600"
            iconClassName="bg-amber-50 text-amber-700"
            borderClassName="border-amber-200"
            testId="pending-articles-stat"
          />
          <DashboardWidget
            label="Approved"
            description="Ready to publish"
            value={statusCounts.Approved}
            onClick={() => applyStatusFilter('Approved')}
            selected={statusFilter === 'Approved'}
            icon={<CheckCircleIcon className="h-4 w-4" />}
            valueClassName="text-blue-600"
            iconClassName="bg-blue-50 text-blue-700"
            borderClassName="border-blue-200"
            testId="approved-articles-stat"
          />
          <DashboardWidget
            label="Unpublished"
            description="Taken off the homepage"
            value={statusCounts.Unpublished}
            onClick={() => applyStatusFilter('Unpublished')}
            selected={statusFilter === 'Unpublished'}
            icon={<BanIcon className="h-4 w-4" />}
            valueClassName="text-brand-red"
            iconClassName="bg-brand-red/10 text-brand-red"
            borderClassName="border-brand-red/25"
            testId="unpublished-articles-stat"
          />
        </div>
      )}

      <section
        className="table-card overflow-visible rounded border border-brand-border bg-brand-surface shadow-sm"
        data-testid="article-management-section"
      >
        <div className="border-b border-brand-border bg-brand-bg/40 px-4 py-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-brand-text-primary">
              Articles
            </h2>
            <p className="mt-0.5 text-xs text-brand-text-secondary">
              Search and filter submissions, then open any row for details.
            </p>
          </div>

          <div className="relative min-w-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon className="h-4 w-4 text-brand-text-secondary" />
            </span>
            <input
              type="search"
              placeholder="Search by title"
              data-testid="article-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-brand-border bg-brand-surface py-2.5 pl-9 pr-3 text-sm text-brand-text-primary transition-colors placeholder:text-brand-text-secondary focus:border-brand-red focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              applyStatusFilter(e.target.value as ArticleStatusFilter)
            }
            data-testid="status-filter-select"
            className="sr-only"
            aria-label="Filter articles by status"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All Statuses' : status}
              </option>
            ))}
          </select>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((status) => (
              <FilterChip
                key={status}
                label={status === 'All' ? 'All statuses' : status}
                selected={statusFilter === status}
                onClick={() => applyStatusFilter(status)}
              />
            ))}
          </div>
        </div>

        {loading && (
          <PageLoader
            testId="loading-state"
            message="Loading articles"
            className="min-h-0 py-20"
          />
        )}
        {!loading && articles.length === 0 && (
          <div
            className="py-20 text-center text-sm text-brand-text-secondary"
            data-testid="empty-state"
          >
            No articles found.
          </div>
        )}
        {!loading && articles.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg/40">
                    <SortableHeader
                      label="Title"
                      field="title"
                      activeField={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
                      Author
                    </th>
                    <SortableHeader
                      label="Views"
                      field="views"
                      activeField={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
                      Likes
                    </th>
                    <SortableHeader
                      label="Created"
                      field="createdAt"
                      activeField={sortField}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {articles.map((article) => (
                    <tr
                      key={article.id}
                      className="article-row transition-colors hover:bg-brand-hover"
                      data-testid="article-row"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="font-medium text-brand-text-primary transition-colors hover:text-brand-red"
                          data-testid={`article-link-${article.id}`}
                        >
                          {article.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={article.status} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-brand-text-primary">
                          {article.authorName}
                        </p>
                        {article.authorEmail && (
                          <p className="text-xs text-brand-text-secondary">
                            {article.authorEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-text-secondary">
                        {article.views}
                      </td>
                      <td className="px-4 py-3 text-brand-text-secondary">
                        {article.likeCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-brand-text-secondary">
                        {formatDate(article.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="flex items-center justify-between border-t border-brand-border bg-brand-bg/40 px-4 py-3 text-xs text-brand-text-secondary"
              data-testid="pagination-controls"
            >
              <span>
                Page {page} of {totalPages} · {total} article
                {total !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  data-testid="pagination-prev"
                  className="rounded border border-brand-border px-3 py-1.5 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  data-testid="pagination-next"
                  className="rounded border border-brand-border px-3 py-1.5 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function AdminArticlesPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[UserRoleValue.Admin]}>
      <ArticleManagementContent />
    </RoleGuard>
  );
}
