// apps/api/src/v1/lib/pusherEvents.ts
//
// Centralised Pusher event constants.
// All backend services and the frontend hook import from this single location,
// so renaming an event or channel format requires a change in exactly one place.

/**
 * The event name broadcast when a new notification is created.
 * Frontend: channel.bind(PUSHER_NOTIFICATION_EVENT, handler)
 */
export const PUSHER_NOTIFICATION_EVENT = 'notification:new' as const;

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
