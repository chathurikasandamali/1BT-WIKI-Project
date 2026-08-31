'use client';

// apps/web/src/components/providers/NotificationProvider.tsx
//
// Owns the entire Pusher connection lifecycle and notification state.
// Exposes NotificationContext to any descendent component.
//
// Placement in the tree:
//   <UserProvider>          ← provides user.id via useUser()
//     <NotificationProvider>  ← reads user.id, connects Pusher, owns state
//       ... rest of app
//     </NotificationProvider>
//   </UserProvider>

import React, { createContext, useContext } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useNotifications } from '@/lib/hooks/useNotifications';
import type { Notification } from '@/lib/api/notifications';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface NotificationContextValue {
  /** All notifications for the user, ordered newest-first. */
  notifications: Notification[];
  /** Count of unread notifications — drives the Navbar badge. */
  unreadCount: number;
  /** True while the initial data fetch is in progress. */
  loading: boolean;
  /**
   * Mark a single notification as read.
   * Updates local state optimistically and calls PATCH /notifications/:id/read.
   */
  markAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface NotificationProviderProps {
  children: React.ReactNode;
}

/**
 * Provides real-time notification state to the entire dashboard subtree.
 *
 * Must be rendered inside <UserProvider> so it can access the authenticated
 * user's ID to build the Pusher private channel name (private-user-{id}).
 *
 * When the user is not yet loaded (loading state) or not authenticated,
 * Pusher is not connected and the state defaults to empty.
 */
export function NotificationProvider({
  children,
}: NotificationProviderProps): React.JSX.Element {
  const { user } = useUser();

  const { notifications, unreadCount, loading, markAsRead } = useNotifications({
    userId: user?.id ?? null,
  });

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Read notification state from the nearest NotificationProvider.
 *
 * @throws Error if called outside a <NotificationProvider>
 */
export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (ctx === undefined) {
    throw new Error(
      'useNotificationContext() must be used within a <NotificationProvider>'
    );
  }
  return ctx;
}
