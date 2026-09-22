'use client';

import React from 'react';

const PAGE_BUTTON_CLASS =
  'rounded border border-brand-border px-3 py-1.5 transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50';

interface TechTalkPaginationProps {
  page: number;
  totalPages: number;
  /** Total row count across all pages, shown in the summary line. */
  total: number;
  onPageChange: (page: number) => void;
}

export function TechTalkPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: TechTalkPaginationProps): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-between border-t border-brand-border bg-brand-bg/40 px-4 py-3 text-xs text-brand-text-secondary"
      data-testid="pagination-controls"
    >
      <span>
        Page {page} of {totalPages} · {total} tech talk{total !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          data-testid="pagination-prev"
          className={PAGE_BUTTON_CLASS}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          data-testid="pagination-next"
          className={PAGE_BUTTON_CLASS}
        >
          Next
        </button>
      </div>
    </div>
  );
}
