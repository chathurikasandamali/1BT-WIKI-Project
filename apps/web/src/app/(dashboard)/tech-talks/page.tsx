'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { TechTalkCard } from '@/components/techTalks/TechTalkCard';
import { usePublishedTechTalks } from '@/lib/hooks/useTechTalks';
import { skeletonKeys } from '@/lib/utils/skeletonKeys';

interface SortOption {
  label: string;
  field: 'eventDate' | 'title';
  order: 'asc' | 'desc';
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Event Date (Newest)', field: 'eventDate', order: 'desc' },
  { label: 'Event Date (Oldest)', field: 'eventDate', order: 'asc' },
  { label: 'Title (A–Z)', field: 'title', order: 'asc' },
  { label: 'Title (Z–A)', field: 'title', order: 'desc' },
];

const SEARCH_DEBOUNCE_MS = 400;

export default function TechTalksPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const limit = 20;

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sort
  const [sortIndex, setSortIndex] = useState(0);
  const selectedSort = SORT_OPTIONS[sortIndex]!;

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

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortIndex(Number(e.target.value));
      setPage(1);
    },
    []
  );

  const { techTalks, total, loading, error } = usePublishedTechTalks(
    page,
    limit,
    debouncedSearch.trim() !== '' ? debouncedSearch.trim() : undefined,
    selectedSort.field,
    selectedSort.order
  );

  const totalPages = Math.ceil(total / limit) || 1;
  const hasTalks = techTalks.length > 0;

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // JSX Condition Extractions to satisfy rule: "Use Named Booleans for Compound Conditions in JSX"
  const showError = !!error;
  const showEmptyState = !loading && !hasTalks && !error;
  const showContent = !loading && hasTalks;
  const showPagination = total > limit;
  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text-primary font-display">
            Tech Talks
          </h1>
          <p className="text-sm text-brand-text-secondary mt-1">
            Browse published tech talks presented by the team.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={handleSearchChange}
              data-testid="techtalk-search-input"
              className="w-full sm:w-64 pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded text-sm text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors"
            />
          </div>

          <select
            value={sortIndex}
            onChange={handleSortChange}
            data-testid="techtalk-sort-select"
            className="px-3 py-2 bg-brand-surface border border-brand-border rounded text-sm text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((opt, i) => (
              <option key={opt.label} value={i}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showError && (
        <div
          className="p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm mb-6"
          data-testid="techtalks-error"
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          data-testid="techtalks-loading"
        >
          {skeletonKeys('tech_talks_', 4).map((item) => (
            <div
              key={item.key}
              className="flex flex-col gap-4 p-5 bg-brand-surface border border-brand-border rounded animate-pulse"
            >
              <div className="h-4 bg-brand-border rounded w-1/4"></div>
              <div className="h-6 bg-brand-border rounded w-3/4"></div>
              <div className="h-4 bg-brand-border rounded w-1/2"></div>
              <div className="h-16 bg-brand-border rounded w-full"></div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
                <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEmptyState && (
        <div
          className="py-16 text-center text-brand-text-secondary text-sm bg-brand-surface border border-brand-border rounded animate-fade-in"
          data-testid="techtalks-empty"
        >
          No Tech Talks found.
        </div>
      )}

      {showContent && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {techTalks.map((talk) => (
              <TechTalkCard key={talk.id} techTalk={talk} />
            ))}
          </div>

          {showPagination && (
            <div
              className="flex justify-center items-center gap-4 mt-8"
              data-testid="techtalk-pagination-controls"
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={isFirstPage}
                className="px-4 py-2 border border-brand-border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                data-testid="techtalk-pagination-prev"
              >
                Previous
              </button>
              <span className="text-brand-text-secondary text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={isLastPage}
                className="px-4 py-2 border border-brand-border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                data-testid="techtalk-pagination-next"
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
