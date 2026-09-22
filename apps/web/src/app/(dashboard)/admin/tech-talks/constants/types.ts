import { TechTalkStatus } from '@repo/shared';

/** Columns the admin Tech Talk table can be sorted by. */
export type SortField = 'title' | 'eventDate';

export type SortDir = 'asc' | 'desc';

/** A status filter selection, including the "no filter applied" option. */
export type StatusFilter = TechTalkStatus | 'All';

/** Actions that require confirmation before they are applied. */
export type TechTalkModalAction =
  | typeof TechTalkStatus.published
  | typeof TechTalkStatus.unpublished
  | 'delete';

/** Totals rendered by the summary tiles, keyed by status plus an "all" total. */
export type TechTalkStatusCounts = Record<'all' | TechTalkStatus, number>;

/**
 * Viewport-relative anchor for a portaled menu. Exactly one of `top` /
 * `bottom` is set: `bottom` anchors the menu above its trigger so the browser
 * grows it upward using its real height.
 */
export interface MenuPosition {
  left: number;
  top?: number;
  bottom?: number;
}
