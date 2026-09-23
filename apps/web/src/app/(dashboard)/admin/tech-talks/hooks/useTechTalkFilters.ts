'use client';

import { useRef, useState } from 'react';
import { TechTalkStatus } from '@repo/shared';
import type { AdminTechTalkListQuery } from '@/lib/api/techTalks';
import { PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/constants';
import type { SortDir, SortField, StatusFilter } from '../constants/types';

export interface TechTalkFilters {
  search: string;
  /** Updates the input immediately; the refetch is debounced. */
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  applyStatusFilter: (status: StatusFilter) => void;
  sortField: SortField;
  sortDir: SortDir;
  toggleSort: (field: SortField) => void;
  page: number;
  setPage: (page: number) => void;
  /** Query for useAllTechTalks(), derived from the state above. */
  query: AdminTechTalkListQuery;
}

/**
 * Owns search / status / sort / page state for the admin Tech Talk table and
 * derives the list query from it. Any filter change resets back to page 1.
 */
export function useTechTalkFilters(): TechTalkFilters {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(TechTalkStatus.all);
  const [sortField, setSortField] = useState<SortField>('eventDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSearchChange = (value: string): void => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  };

  const applyStatusFilter = (status: StatusFilter): void => {
    setStatusFilter(status);
    setPage(1);
  };

  const toggleSort = (field: SortField): void => {
    setPage(1);
    if (sortField === field) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir('asc');
  };

  // `all` means "no filter"; `deleted` is a UI-only sentinel the backend
  // doesn't support filtering by — neither is sent as a status query param.
  const query: AdminTechTalkListQuery = {
    page,
    limit: PAGE_SIZE,
    status:
      statusFilter === TechTalkStatus.all || statusFilter === TechTalkStatus.deleted
        ? undefined
        : statusFilter,
    search: debouncedSearch || undefined,
    sort: sortField,
    order: sortDir,
  };

  return {
    search,
    onSearchChange,
    statusFilter,
    applyStatusFilter,
    sortField,
    sortDir,
    toggleSort,
    page,
    setPage,
    query,
  };
}
