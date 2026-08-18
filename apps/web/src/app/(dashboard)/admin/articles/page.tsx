'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  fetchAllArticles,
  type AdminArticleListItem,
  type AdminArticleStatusFilter,
} from '@/lib/api/articles';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { RefreshIcon } from '@/components/shared/icons/RefreshIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { ChevronUpIcon } from '@/components/shared/icons/ChevronUpIcon';

gsap.registerPlugin(useGSAP);

// ── Internal types ────────────────────────────────────────────────────────────

type SortField = 'title' | 'createdAt' | 'views';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: AdminArticleStatusFilter[] = [
  'Pending',
  'Published',
  'Unpublished',
];

const PAGE_SIZE = 12;

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <ChevronUpIcon
      className={cn(
        'w-3.5 h-3.5 transition-transform',
        active ? 'text-brand-red' : 'text-brand-text-secondary/40',
        active && dir === 'desc' && 'rotate-180'
      )}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ArticleManagementContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    AdminArticleStatusFilter | 'All'
  >('All');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<
    'All' | 'Published' | 'Pending' | 'Unpublished',
    number
  > | null>(null);

  // Debounce search so we don't refetch on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch articles (server-side filter/sort/paginate) ───────────────────────

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

  // ── Summary counts (fetched independently of the filtered list) ─────────────

  const loadStatusCounts = useCallback(async () => {
    try {
      const [all, published, pending, unpublished] = await Promise.all([
        fetchAllArticles({ page: 1, limit: 1 }),
        fetchAllArticles({ page: 1, limit: 1, status: 'Published' }),
        fetchAllArticles({ page: 1, limit: 1, status: 'Pending' }),
        fetchAllArticles({ page: 1, limit: 1, status: 'Unpublished' }),
      ]);
      setStatusCounts({
        All: all.total,
        Published: published.total,
        Pending: pending.total,
        Unpublished: unpublished.total,
      });
    } catch {
      // Non-blocking: the table still works without summary tiles.
      setStatusCounts(null);
    }
  }, []);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts]);

  // ── GSAP entrance animation ─────────────────────────────────────────────────

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

  // ── Sorting ─────────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    setPage(1);
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Render ──────────────────────────────────────────────────────────────────
  const showSummaryStats = !loading && !error && !!statusCounts;

  return (
    <div className="p-8 max-w-6xl mx-auto" ref={containerRef}>
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
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
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-brand-border text-brand-text-secondary hover:bg-brand-hover rounded transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary */}
      {showSummaryStats && (
        <div className="page-header grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Articles',
              value: statusCounts.All,
              color: 'text-brand-text-primary',
              testId: 'total-articles-stat',
            },
            {
              label: 'Published',
              value: statusCounts.Published,
              color: 'text-green-600',
              testId: 'published-articles-stat',
            },
            {
              label: 'Pending',
              value: statusCounts.Pending,
              color: 'text-amber-600',
              testId: 'pending-articles-stat',
            },
            {
              label: 'Unpublished',
              value: statusCounts.Unpublished,
              color: 'text-brand-red',
              testId: 'unpublished-articles-stat',
            },
          ].map(({ label, value, color, testId }) => (
            <div
              key={label}
              className="bg-brand-surface border border-brand-border rounded shadow-sm px-4 py-3"
            >
              <p className="text-xs font-medium text-brand-text-secondary uppercase tracking-wider mb-1">
                {label}
              </p>
              <p className={cn('text-2xl font-bold', color)} data-testid={testId}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Global error banner */}
      {error && (
        <div
          className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm flex items-center justify-between"
          data-testid="error-banner"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-brand-red hover:text-brand-red-hover text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="table-card bg-brand-surface border border-brand-border rounded shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-brand-border flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-brand-bg/40">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="w-4 h-4 text-brand-text-secondary" />
            </span>
            <input
              type="search"
              placeholder="Search by title…"
              data-testid="article-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-brand-surface border border-brand-border rounded focus:outline-none focus:border-brand-red transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as AdminArticleStatusFilter | 'All'
                );
                setPage(1);
              }}
              data-testid="status-filter-select"
              className="text-xs font-medium px-3 py-2 bg-brand-surface border border-brand-border rounded text-brand-text-secondary focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* Sort controls */}
            <div className="flex items-center gap-1 border border-brand-border rounded overflow-hidden bg-brand-surface">
              {(['title', 'createdAt', 'views'] as SortField[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleSort(f)}
                  data-testid={`sort-btn-${f}`}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors capitalize',
                    sortField === f
                      ? 'bg-brand-red/8 text-brand-red'
                      : 'text-brand-text-secondary hover:bg-brand-bg'
                  )}
                >
                  {f === 'createdAt' ? 'Created' : f}
                  <SortIcon active={sortField === f} dir={sortDir} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <div
            className="py-20 flex flex-col items-center justify-center gap-3"
            data-testid="loading-state"
          >
            <div className="w-6 h-6 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
            <p className="text-sm text-brand-text-secondary">
              Loading articles…
            </p>
          </div>
        ) : articles.length === 0 ? (
          <div
            className="py-20 text-center text-sm text-brand-text-secondary"
            data-testid="empty-state"
          >
            No articles found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-brand-text-secondary border-b border-brand-border bg-brand-bg/40">
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Author</th>
                    <th className="px-4 py-3 font-medium">Views</th>
                    <th className="px-4 py-3 font-medium">Likes</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr
                      key={article.id}
                      className="article-row border-b border-brand-border last:border-b-0 hover:bg-brand-hover transition-colors"
                      data-testid="article-row"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="font-medium text-brand-text-primary hover:text-brand-red transition-colors"
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
                      <td className="px-4 py-3 text-brand-text-secondary whitespace-nowrap">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              className="px-4 py-3 border-t border-brand-border flex items-center justify-between text-xs text-brand-text-secondary bg-brand-bg/40"
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
                  className="px-3 py-1.5 border border-brand-border rounded hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  data-testid="pagination-next"
                  className="px-3 py-1.5 border border-brand-border rounded hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page export (wrapped in RoleGuard) ────────────────────────────────────────

export default function AdminArticlesPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <ArticleManagementContent />
    </RoleGuard>
  );
}
