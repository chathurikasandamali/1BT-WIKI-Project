'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { ArticleCard } from '@/components/article-listing/ArticleCard';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { FileIcon } from '@/components/shared/icons/FileIcon';

interface ArticleItem {
  id: string;
  title: string;
  authorId: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  views: number;
  coverImageUrl: string | null;
}

interface ArticlesResponse {
  articles: ArticleItem[];
  total: number;
  page: number;
  limit: number;
}

type SortField = 'createdAt' | 'title' | 'views';
type SortOrder = 'asc' | 'desc';

interface SortOption {
  label: string;
  field: SortField;
  order: SortOrder;
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest', field: 'createdAt', order: 'desc' },
  { label: 'Oldest', field: 'createdAt', order: 'asc' },
  { label: 'Title A–Z', field: 'title', order: 'asc' },
  { label: 'Title Z–A', field: 'title', order: 'desc' },
  { label: 'Most viewed', field: 'views', order: 'desc' },
];

const SEARCH_DEBOUNCE_MS = 400;  //wait 400ms to call API for search query

export default function ArticlesPage(): React.JSX.Element {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sort
  const [sortIndex, setSortIndex] = useState(0);

  // Debounce search input — resets to page 1 on new query
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  // Wire sort select — resets to page 1 on change
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortIndex(Number(e.target.value));
      setPage(1);
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchArticles() {
      try {
        setLoading(true);
        setError(null);

        const selectedSort = SORT_OPTIONS[sortIndex]!;

        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sort: selectedSort.field,
          order: selectedSort.order,
        });

        if (debouncedSearch.trim() !== '') {
          params.set('search', debouncedSearch.trim());
        }

        const response = await apiFetch<ArticlesResponse>(
          `articles?${params.toString()}`
        );

        if (isMounted && response.data) {
          console.log('Fetched articles:', response.data.articles);
          setArticles(response.data.articles);
          setTotal(response.data.total);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load articles'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchArticles();

    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, sortIndex]);

  const totalPages = Math.ceil(total / limit) || 1;
  const hasArticles = articles.length > 0;

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-brand-text-primary">Articles</h1>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={handleSearchChange}
              data-testid="search-input"
              className="w-full md:w-72 pl-10 pr-4 py-2 border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <SearchIcon width="18" height="18" />
            </div>
          </div>

          <select
            value={sortIndex}
            onChange={handleSortChange}
            data-testid="sort-select"
            className="px-4 py-2 bg-gray-50 border border-brand-border rounded-lg text-gray-600 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt, i) => (
              <option key={opt.label} value={i}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-8 text-brand-red bg-red-50 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          data-testid="loading-skeleton"
        >
          {[...Array(limit)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 bg-white border border-brand-border rounded-lg overflow-hidden animate-pulse"
            >
              <div className="aspect-video w-full bg-brand-border"></div>
              <div className="flex flex-col gap-4 px-6">
                <div className="h-6 bg-brand-border rounded w-3/4"></div>
                <div className="h-4 bg-brand-border rounded w-1/2"></div>
                <div className="flex gap-2 mt-4">
                  <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
                  <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between items-center px-6 pb-6">
                <div className="flex gap-4">
                  <div className="h-4 w-8 bg-brand-border rounded"></div>
                  <div className="h-4 w-8 bg-brand-border rounded"></div>
                  <div className="h-4 w-8 bg-brand-border rounded"></div>
                </div>
                <div className="h-4 w-20 bg-brand-border rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : !hasArticles ? (
        <div
          className="text-center py-20 bg-gray-50 rounded-lg border border-brand-border border-dashed"
          data-testid="empty-state"
        >
          <FileIcon
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            strokeWidth="1"
          />
          <h3 className="text-lg font-medium text-brand-text-primary">
            No articles found
          </h3>
          <p className="text-brand-text-secondary mt-1">
            Check back later or try adjusting your search.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                id={article.id}
                title={article.title}
                tags={article.tags}
                likeCount={article.likeCount}
                commentCount={article.commentCount}
                views={article.views}
                createdAt={article.createdAt}
                coverImageUrl={article.coverImageUrl}
              />
            ))}
          </div>

          {total > limit && (
            <div
              className="flex justify-center items-center gap-4 mt-8"
              data-testid="pagination-controls"
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-brand-border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                data-testid="pagination-prev"
              >
                Previous
              </button>
              <span className="text-brand-text-secondary text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-brand-border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                data-testid="pagination-next"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
