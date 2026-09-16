// apps/web/src/lib/pusherEvents.ts
//
// Centralised Pusher event constants for the frontend.
// Must stay in sync with apps/api/src/v1/lib/pusherEvents.ts so the event names
// and channel format broadcast by the backend are always referenced from a
// single location on each side.

/**
 * The event name broadcast when an Admin changes the user's role.
 * Frontend: channel.bind(PUSHER_ROLE_CHANGED_EVENT, handler)
 */
export const PUSHER_ROLE_CHANGED_EVENT = 'role-changed' as const;

/**
 * Derives the private channel name for a given user.
 *
 * Pusher private channels require the "private-" prefix and authenticate
 * via the /pusher/auth endpoint.
 *
 * @param userId - The recipient's user ID (UUID from PostgreSQL)
 */
export const pusherChannelName = (userId: string): string =>
  `private-user-${userId}`;