// apps/api/src/types/notificationTypes.ts

// ---------------------------------------------------------------------------
// Domain enums / unions — mirror the Postgres ENUM types exactly
// ---------------------------------------------------------------------------

export type NotificationType = 'success' | 'failure' | 'info';

export type NotificationReferenceType =
  | 'article'
  | 'tech_talk'
  | 'comment'
  | 'like'
  | 'review';

// ---------------------------------------------------------------------------
// Entity interface — mirrors the `notifications` table (snake_case → camelCase)
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  recipientId: string;
  notificationTitle: string;
  notificationReferenceType: NotificationReferenceType;
  referenceId: string;
  notificationType: NotificationType;
  message: string;
  isRead: boolean;
  readAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Input interface — fields required to INSERT a new notification
// (id, isRead, readAt, deletedAt, createdAt are DB-generated / defaulted)
// ---------------------------------------------------------------------------

export interface CreateNotificationInput {
  recipientId: string;
  notificationTitle: string;
  notificationReferenceType: NotificationReferenceType;
  referenceId: string;
  notificationType: NotificationType;
  message: string;
}
