// apps/api/src/services/notificationService.ts

import NotificationRepository from '@repositories/notificationRepository.js';
import type {
  CreateNotificationInput,
  Notification,
} from '@models/notificationTypes.js';
import { AppError } from '@errors/AppError.js';
import pusherClient from '@v1/lib/pusherClient.js';
import {
  PUSHER_NOTIFICATION_EVENT,
  pusherChannelName,
} from '@v1/lib/pusherEvents.js';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Notification service — thin orchestration layer over the repository.
 *
 * `send()` is designed to be called fire-and-forget by other services:
 *
 *   notificationService.send(payload).catch(err => console.error(err));
 *
 * Errors propagate normally (not swallowed here) so the caller can decide
 * whether to log or ignore them.
 */
class NotificationService {
  /**
   * Persist a new notification in the database, then broadcast it via Pusher.
   *
   * Order of operations is guaranteed:
   *   1. PostgreSQL write completes first (source of truth).
   *   2. Pusher trigger fires after, as fire-and-forget.
   *
   * A Pusher failure is logged but never propagated — it must NOT fail
   * notification creation. The saved DB row is the permanent record.
   *
   * @param payload - Fields required to create the notification row
   */
  async send(payload: CreateNotificationInput): Promise<void> {
    // 1. Persist to PostgreSQL — any error here propagates normally.
    const saved = await NotificationRepository.create(payload);

    // 2. Broadcast via Pusher — fire-and-forget.
    //    `void` intentionally discards the Promise return value.
    //    `.catch` ensures rejections are logged, not silently swallowed.
    void pusherClient
      .trigger(
        pusherChannelName(saved.recipientId),
        PUSHER_NOTIFICATION_EVENT,
        {
          id: saved.id,
          recipientId: saved.recipientId,
          title: saved.notificationTitle,
          message: saved.message,
          isRead: saved.isRead,
          createdAt: saved.createdAt,
        }
      )
      .catch((error: unknown) => {
        console.error(
          '[Pusher] Failed to trigger notification:new event:',
          error
        );
      });
  }

  /**
   * Return paginated notifications for the given user.
   *
   * @param userId  - The recipient's user id
   * @param options - Pagination controls (limit, offset)
   */
  async list(
    userId: string,
    options: { limit: number; offset: number }
  ): Promise<Notification[]> {
    return NotificationRepository.list(userId, options);
  }

  async markAsRead(id: string, recipientId: string): Promise<Notification> {
    const notification = await NotificationRepository.markAsRead(
      id,
      recipientId
    );

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    return notification;
  }

  /**
   * Return the number of unread notifications for the given user.
   *
   * @param userId - The recipient's user id
   */
  async countUnread(userId: string): Promise<number> {
    return NotificationRepository.countUnread(userId);
  }
}

export default new NotificationService();
