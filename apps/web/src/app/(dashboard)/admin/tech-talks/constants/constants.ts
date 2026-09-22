import { TechTalkStatus } from '@repo/shared';
import type { StatusFilter } from './types';

export const PAGE_SIZE = 12;

/** Delay before a typed search term triggers a refetch. */
export const SEARCH_DEBOUNCE_MS = 400;

export const STATUS_FILTERS: StatusFilter[] = [
  'All',
  TechTalkStatus.draft,
  TechTalkStatus.published,
  TechTalkStatus.unpublished,
];

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  All: 'All statuses',
  [TechTalkStatus.draft]: 'Draft',
  [TechTalkStatus.published]: 'Published',
  [TechTalkStatus.unpublished]: 'Unpublished',
};

// ── Actions menu DOM ids ──────────────────────────────────────────────────────
// The menu is portaled to <body>, so the trigger and its panel are no longer
// DOM siblings. These ids let a single document-level listener pair them back
// up for outside-click detection and focus restoration.

export const menuTriggerId = (techTalkId: string): string =>
  `dropdown-trigger-${techTalkId}`;

export const menuPanelId = (techTalkId: string): string =>
  `dropdown-menu-${techTalkId}`;
