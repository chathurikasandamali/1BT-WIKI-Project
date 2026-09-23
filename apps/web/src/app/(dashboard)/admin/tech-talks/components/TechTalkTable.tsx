'use client';

import React from 'react';
import Link from 'next/link';
import { TechTalkStatus } from '@repo/shared';
import type { TechTalkListItem } from '@/lib/api/techTalks';
import { SortableHeader } from '@/components/admin/SortableHeader';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { TechTalkActionsMenu } from './TechTalkActionsMenu';
import { TechTalkStatusBadge } from './TechTalkStatusBadge';
import type { SortDir, SortField } from '../constants/types';

const HEADER_CLASS =
  'px-4 py-3 text-xs font-medium uppercase tracking-wider text-brand-text-secondary';

interface TechTalkTableProps {
  techTalks: TechTalkListItem[];
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  /** Row whose actions menu is open, from useActionsMenu(). */
  activeMenuId: string | null;
  onToggleMenu: (techTalkId: string) => void;
  onCloseMenu: () => void;
  isMutating: boolean;
  onPublish: (techTalkId: string) => void;
  onUnpublish: (techTalkId: string) => void;
  onDelete: (techTalkId: string) => void;
}

export function TechTalkTable({
  techTalks,
  sortField,
  sortDir,
  onSort,
  activeMenuId,
  onToggleMenu,
  onCloseMenu,
  isMutating,
  onPublish,
  onUnpublish,
  onDelete,
}: TechTalkTableProps): React.JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-border bg-brand-bg/40">
            <SortableHeader
              label="Title"
              field="title"
              activeField={sortField}
              dir={sortDir}
              onSort={onSort}
            />
            <th className={cn(HEADER_CLASS, 'text-left')}>Status</th>
            <th className={cn(HEADER_CLASS, 'text-left')}>Presenters</th>
            <SortableHeader
              label="Event date"
              field="eventDate"
              activeField={sortField}
              dir={sortDir}
              onSort={onSort}
            />
            <th className={cn('w-20', HEADER_CLASS, 'text-right')}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border">
          {techTalks.map((techTalk) => (
            <tr
              key={techTalk.id}
              className="techtalk-row transition-colors hover:bg-brand-hover"
              data-testid={`techtalk-row-${techTalk.id}`}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/tech-talks/${techTalk.id}`}
                  className="font-medium text-brand-text-primary transition-colors hover:text-brand-red"
                  data-testid={`techtalk-link-${techTalk.id}`}
                >
                  {techTalk.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <TechTalkStatusBadge status={techTalk.status} />
              </td>
              <td className="px-4 py-3 text-brand-text-secondary">
                {techTalk.presenters.join(', ') || '—'}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-brand-text-secondary">
                {formatDate(techTalk.eventDate)}
              </td>
              <td className="px-4 py-3 text-right">
                <TechTalkActionsMenu
                  techTalkId={techTalk.id}
                  isPublished={techTalk.status === TechTalkStatus.published}
                  isOpen={activeMenuId === techTalk.id}
                  isMutating={isMutating}
                  onToggle={() => onToggleMenu(techTalk.id)}
                  onClose={onCloseMenu}
                  onPublish={() => onPublish(techTalk.id)}
                  onUnpublish={() => onUnpublish(techTalk.id)}
                  onDelete={() => onDelete(techTalk.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
