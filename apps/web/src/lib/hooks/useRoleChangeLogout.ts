'use client';

// apps/web/src/lib/hooks/useRoleChangeLogout.ts
//
// Listens for the backend's role-changed Pusher event on the affected
// user's private channel. When an Admin changes the user's role, every open
// tab subscribed to that channel signs the user out for real time.
//
// Responsibilities are split deliberately:
//   - useNotifications          → handles only notification:new
//   - useRoleChangeLogout       → handles only role-changed
//
// The shared private-user-{userId} channel is reused via
// subscribeToUserChannelEvent() — this hook never creates a second Pusher
// connection and never unsubscribes a channel another feature still needs.

import { useEffect } from 'react';
import { authClient } from '@/lib/auth/client';
import { PUSHER_ROLE_CHANGED_EVENT } from '@/lib/pusherEvents';
import { subscribeToUserChannelEvent } from '@/lib/pusherSubscription';

// Session-level guard: one logout per tab. Prevents a second role-change event
// delivered before navigation completes from re-invoking authClient.signOut().
let logoutInFlight = false;

const performRoleChangeLogout = async (): Promise<void> => {
  if (logoutInFlight) return;
  logoutInFlight = true;

  try {
    await authClient.signOut();
    window.location.assign('/signin');
  } catch (error) {
    console.error(
      '[useRoleChangeLogout] Failed to sign out after role change:',
      error
    );
  } finally {
    logoutInFlight = false;
  }
};

/**
 * Automatically signs the user out when the backend broadcasts
 * role-changed on their private Pusher channel.
 *
 * @param userId - The authenticated user's ID (null when signed out)
 */
export function useRoleChangeLogout(userId: string | null): void {
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserChannelEvent(
      userId,
      PUSHER_ROLE_CHANGED_EVENT,
      () => {
        // The payload carries the new role for forward-compatibility; the
        // sign-out itself does not depend on it.
        void performRoleChangeLogout();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);
}