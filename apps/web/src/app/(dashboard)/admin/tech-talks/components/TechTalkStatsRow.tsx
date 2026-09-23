'use client';

import React from 'react';
import { TechTalkStatus } from '@repo/shared';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { BanIcon } from '@/components/shared/icons/BanIcon';
import { FileIcon } from '@/components/shared/icons/FileIcon';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import type { StatusFilter, TechTalkStatusCounts } from '../constants/types';

interface TechTalkStatsRowProps {
  counts: TechTalkStatusCounts;
  statusFilter: StatusFilter;
  /** Selecting a tile filters the table by that status. */
  onSelect: (status: StatusFilter) => void;
}

export function TechTalkStatsRow({
  counts,
  statusFilter,
  onSelect,
}: TechTalkStatsRowProps): React.JSX.Element {
  return (
    <div className="page-header mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardWidget
        label="Total Tech Talks"
        description="Talks across every status"
        value={counts.all}
        onClick={() => onSelect(TechTalkStatus.all)}
        selected={statusFilter === TechTalkStatus.all}
        icon={<TechTalkIcon className="h-4 w-4" />}
        borderClassName="border-brand-border"
        testId="total-techtalks-stat"
      />
      <DashboardWidget
        label="Published"
        description="Visible to everyone"
        value={counts.published}
        onClick={() => onSelect(TechTalkStatus.published)}
        selected={statusFilter === TechTalkStatus.published}
        icon={<CheckCircleIcon className="h-4 w-4" />}
        valueClassName="text-green-600"
        iconClassName="bg-green-50 text-green-700"
        borderClassName="border-green-200"
        testId="published-techtalks-stat"
      />
      <DashboardWidget
        label="Draft"
        description="Not published yet"
        value={counts.draft}
        onClick={() => onSelect(TechTalkStatus.draft)}
        selected={statusFilter === TechTalkStatus.draft}
        icon={<FileIcon className="h-4 w-4" strokeWidth={2} />}
        valueClassName="text-amber-600"
        iconClassName="bg-amber-50 text-amber-700"
        borderClassName="border-amber-200"
        testId="draft-techtalks-stat"
      />
      <DashboardWidget
        label="Unpublished"
        description="Removed from the public list"
        value={counts.unpublished}
        onClick={() => onSelect(TechTalkStatus.unpublished)}
        selected={statusFilter === TechTalkStatus.unpublished}
        icon={<BanIcon className="h-4 w-4" />}
        valueClassName="text-brand-red"
        iconClassName="bg-brand-red/10 text-brand-red"
        borderClassName="border-brand-red/25"
        testId="unpublished-techtalks-stat"
      />
    </div>
  );
}
