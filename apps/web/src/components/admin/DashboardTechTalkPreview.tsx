import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import type { TechTalkListItem, TechTalkStatus } from '@/lib/api/techTalks';
import { DashboardPreviewTable } from '@/components/admin/DashboardPreviewTable';

const TECH_TALK_HEADERS = ['Title', 'Status', 'Presenters', 'Event date'] as const;

const statusBadgeClass: Record<TechTalkStatus, string> = {
  draft: 'bg-brand-bg text-brand-text-secondary border-brand-border',
  published: 'bg-green-50 text-green-700 border-green-200',
  unpublished: 'bg-brand-red/10 text-brand-red border-brand-red/20',
};

const STATUS_LABEL: Record<TechTalkStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  unpublished: 'Unpublished',
};

interface DashboardTechTalkPreviewProps {
  techTalks: TechTalkListItem[];
  loading: boolean;
}

/**
 * Compact Tech Talk preview for Admin Home.
 */
export function DashboardTechTalkPreview({
  techTalks,
  loading,
}: DashboardTechTalkPreviewProps): React.JSX.Element {
  return (
    <DashboardPreviewTable
      headers={TECH_TALK_HEADERS}
      loading={loading}
      isEmpty={techTalks.length === 0}
      emptyMessage="No Tech Talks found."
      testId="dashboard-techtalks-table"
    >
      {techTalks.map((talk) => (
        <tr
          key={talk.id}
          className="border-b border-brand-border last:border-b-0 transition-colors hover:bg-brand-hover"
          data-testid="dashboard-techtalk-row"
        >
          <td className="px-4 py-3">
            <Link
              href={`/admin/tech-talks/${talk.id}`}
              className="font-medium text-brand-text-primary transition-colors hover:text-brand-red"
            >
              {talk.title}
            </Link>
          </td>
          <td className="px-4 py-3">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                statusBadgeClass[talk.status]
              )}
            >
              {STATUS_LABEL[talk.status]}
            </span>
          </td>
          <td className="px-4 py-3 text-brand-text-secondary">
            {talk.presenters.join(', ') || '—'}
          </td>
          <td className="px-4 py-3 text-brand-text-secondary">
            {formatDate(talk.eventDate)}
          </td>
        </tr>
      ))}
    </DashboardPreviewTable>
  );
}
