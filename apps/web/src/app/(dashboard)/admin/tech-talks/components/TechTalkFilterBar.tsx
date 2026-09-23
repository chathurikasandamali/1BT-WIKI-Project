'use client';

import React from 'react';
import { TechTalkStatus } from '@repo/shared';
import { FilterChip } from '@/components/admin/FilterChip';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { STATUS_FILTERS, STATUS_FILTER_LABELS } from '../constants/constants';
import type { StatusFilter } from '../constants/types';

interface TechTalkFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
}

/** Card header: title, search box, and the status filter chips. */
export function TechTalkFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: TechTalkFilterBarProps): React.JSX.Element {
  return (
    <div className="border-b border-brand-border bg-brand-bg/40 px-4 py-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-brand-text-primary">Tech Talks</h2>
        <p className="mt-0.5 text-xs text-brand-text-secondary">
          Search, filter, and manage talks on the publishing calendar.
        </p>
      </div>

      <div className="relative min-w-0">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          <SearchIcon className="h-4 w-4 text-brand-text-secondary" />
        </span>
        <input
          type="search"
          placeholder="Search by title"
          data-testid="techtalk-search-input"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded border border-brand-border bg-brand-surface py-2.5 pl-9 pr-3 text-sm text-brand-text-primary transition-colors placeholder:text-brand-text-secondary focus:border-brand-red focus:outline-none"
        />
      </div>

      {/* Visually hidden native control — the chips below are the visible UI,
          this keeps the filter reachable for assistive tech and tests. */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        data-testid="techtalk-status-filter"
        className="sr-only"
        aria-label="Filter Tech Talks by status"
      >
        <option value={TechTalkStatus.all}>All Statuses</option>
        <option value={TechTalkStatus.draft}>Draft</option>
        <option value={TechTalkStatus.published}>Published</option>
        <option value={TechTalkStatus.unpublished}>Unpublished</option>
      </select>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((status) => (
          <FilterChip
            key={status}
            label={STATUS_FILTER_LABELS[status]}
            selected={statusFilter === status}
            onClick={() => onStatusFilterChange(status)}
          />
        ))}
      </div>
    </div>
  );
}
