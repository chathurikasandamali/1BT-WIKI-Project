// apps/web/src/lib/api/notifications.ts
//
// Notification API client module.
// Follows the same pattern as articles.ts and comments.ts in this directory:
// each function calls apiFetch and throws on failure, returning typed data.

import { apiFetch } from '@/lib/api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = 'success' | 'failure' | 'info';

export type NotificationReferenceType =
  | 'article'
  | 'tech_talk'
  | 'comment'
  | 'like'
  | 'review';

export interface Notification {
  id: string;
  recipientId: string;
  notificationTitle: string;
  notificationReferenceType: NotificationReferenceType;
  referenceId: string;
  notificationType: NotificationType;
  message: string;
  isRead: boolean;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

/** Shape of the notification:new Pusher event payload. */
export interface PusherNotificationPayload {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch paginated notifications for the authenticated user.
 *
 * GET /api/v1/notifications
 */
export async function getNotifications(
  limit = 20,
  offset = 0
): Promise<Notification[]> {
  const result = await apiFetch<Notification[]>(
    `/notifications?limit=${limit}&offset=${offset}`
  );
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to load notifications');
  }
  return result.data;
}

/**
 * Mark a single notification as read.
 *
 * PATCH /api/v1/notifications/:id/read
 */
export async function markNotificationAsRead(
  id: string
): Promise<Notification> {
  const result = await apiFetch<Notification>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
  if (!result.success || !result.data) {
    throw new Error(result.error ?? 'Failed to mark notification as read');
  }
  return result.data;
}

/**
 * Fetch the count of unread notifications for the authenticated user.
 *
 * GET /api/v1/notifications/unread-count
 */
export async function getUnreadCount(): Promise<number> {
  const result = await apiFetch<{ count: number }>(
    '/notifications/unread-count'
  );
  if (!result.success || result.data === undefined) {
    throw new Error(result.error ?? 'Failed to load unread count');
  }
  return result.data.count;
}
