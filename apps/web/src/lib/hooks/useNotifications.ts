'use client';

// apps/web/src/lib/hooks/useNotifications.ts
//
// Internal hook — consumed exclusively by NotificationProvider.
// Not exported for use in arbitrary components; access state through
// NotificationContext (useNotificationContext) instead.

import { useState, useEffect, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
} from '@/lib/api/notifications';
import type {
  Notification,
  PusherNotificationPayload,
} from '@/lib/api/notifications';

// The event name must match the backend constant in pusherEvents.ts
const NOTIFICATION_EVENT = 'notification:new';

interface UseNotificationsOptions {
  userId: string | null;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
}

export function useNotifications({
  userId,
}: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const [notifs, count] = await Promise.all([
          getNotifications(),
          getUnreadCount(),
        ]);
        if (!cancelled) {
          setNotifications(notifs);
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('[useNotifications] Failed to load initial data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ---------------------------------------------------------------------------
  // Pusher subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!userId) return;

    const pusher = getPusherClient();
    const channelName = `private-user-${userId}`;
    const channel = pusher.subscribe(channelName);

    // Handle incoming real-time notifications
    channel.bind(NOTIFICATION_EVENT, (payload: PusherNotificationPayload) => {
      setNotifications((prev) => {
        // Deduplication guard: skip if this id is already in state
        const alreadyExists = prev.some((n) => n.id === payload.id);
        if (alreadyExists) return prev;

        // Construct a Notification shape from the Pusher payload.
        // The full Notification object will be fetched on next page load;
        // this is the optimistic representation for immediate UI update.
        const newNotification: Notification = {
          id: payload.id,
          recipientId: payload.recipientId,
          notificationTitle: payload.title,
          notificationReferenceType: 'article',
          referenceId: '',
          notificationType: 'info',
          message: payload.message,
          isRead: payload.isRead,
          readAt: null,
          deletedAt: null,
          createdAt: payload.createdAt,
        };

        return [newNotification, ...prev];
      });

      setUnreadCount((prev) => prev + 1);
    });

    // On reconnect, reconcile the unread count to cover events missed offline
    pusher.connection.bind('connected', async () => {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        console.error(
          '[useNotifications] Failed to reconcile unread count:',
          err
        );
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [userId]);

  // ---------------------------------------------------------------------------
  // markAsRead action
  // ---------------------------------------------------------------------------

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );

      // Only decrement if the notification was previously unread
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(
        '[useNotifications] Failed to mark notification as read:',
        err
      );
      throw err;
    }
  }, []);

  return { notifications, unreadCount, loading, markAsRead };
}
