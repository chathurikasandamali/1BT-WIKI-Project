import React from 'react';
import { PageLoader } from '@/components/shared/PageLoader';

interface DashboardPreviewTableProps {
  headers: readonly string[];
  loading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  testId: string;
  children: React.ReactNode;
}

/**
 * Compact table chrome shared by Admin Home preview lists.
 */
export function DashboardPreviewTable({
  headers,
  loading,
  isEmpty,
  emptyMessage,
  testId,
  children,
}: DashboardPreviewTableProps): React.JSX.Element {
  if (loading) {
    return (
      <PageLoader
        testId={`${testId}-loading`}
        className="min-h-0 py-16"
      />
    );
  }

  if (isEmpty) {
    return (
      <div
        className="py-16 text-center text-sm text-brand-text-secondary"
        data-testid={`${testId}-empty`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-border bg-brand-bg/40 text-left text-xs uppercase tracking-wider text-brand-text-secondary">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
