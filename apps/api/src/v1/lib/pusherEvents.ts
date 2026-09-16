export const PUSHER_NOTIFICATION_EVENT = 'notification:new' as const;

export const PUSHER_FORCE_LOGOUT_EVENT = 'session:force-logout' as const;

export const pusherChannelName = (userId: string): string =>
  `private-user-${userId}`;
