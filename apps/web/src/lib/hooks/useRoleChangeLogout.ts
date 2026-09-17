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
import { useToast } from '@/lib/hooks/useToast';
import type { ToastType } from '@/components/shared/Toast';
import { ROLE_CHANGE_TOAST_DELAY_MS, ROLE_CHANGE_TOAST_MESSAGE } from '@repo/shared';

interface RoleChangeToast {
  visible: boolean;
  message: string;
  type: ToastType;
}

// Session-level guard: one logout per tab. Prevents a second role-change event
// delivered before navigation completes from re-invoking authClient.signOut().
let logoutInFlight = false;

const performRoleChangeLogout = async (): Promise<void> => {
  if (logoutInFlight) return;
  logoutInFlight = true;

  try {
    // Give the exit toast time to appear before window.location.assign('/signin')
    // tears the current page down.
    await new Promise<void>((resolve) =>
      setTimeout(resolve, ROLE_CHANGE_TOAST_DELAY_MS)
    );
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
 * role-changed on their private Pusher channel. Surfaces an explanatory
 * toast just before the sign-out so the user knows why they were logged out.
 *
 * @param userId - The authenticated user's ID (null when signed out)
 * @returns The toast state to render via the app's <Toast /> component
 */
export function useRoleChangeLogout(userId: string | null): {
  toast: RoleChangeToast;
} {
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserChannelEvent(
      userId,
      PUSHER_ROLE_CHANGED_EVENT,
      () => {
        // The payload carries the new role for forward-compatibility; the
        // sign-out itself does not depend on it.
        showToast(ROLE_CHANGE_TOAST_MESSAGE, 'info');
        void performRoleChangeLogout();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, showToast]);

  return { toast };
}