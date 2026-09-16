// apps/web/src/lib/pusherSubscription.ts
//
// Small reference-counted wrapper around the shared Pusher singleton so that
// multiple features (notifications, role-change logout) can bind handlers to
// the same private-user-{userId} channel without tearing it down underneath
// each other.
//
// Guarantees:
//   - The channel is unsubscribed only when the LAST consumer leaves.
//   - Each consumer removes only its own handler on cleanup, so React
//     StrictMode mount → cleanup → mount cycles never accumulate handlers.

import { getPusherClient } from '@/lib/pusher';
import { pusherChannelName } from '@/lib/pusherEvents';

export type PusherEventUnsubscriber = () => void;

// Tracks how many consumers are currently bound to each private channel.
// Module-level so every hook instance shares the same accounting.
const channelRefCounts = new Map<string, number>();

/**
 * Subscribe a handler to `event` on the user's private channel.
 *
 * Safe to call multiple times for the same user/event: each call binds its own
 * handler and returns an unsubscribe function that removes exactly that
 * handler. The shared channel is unsubscribed from Pusher only when the last
 * consumer unsubscribes.
 *
 * @param userId  - The authenticated user's ID (builds the channel name)
 * @param event   - The Pusher event name to listen for
 * @param handler - Callback invoked with the event's parsed payload
 */
export function subscribeToUserChannelEvent<T>(
  userId: string,
  event: string,
  handler: (data: T) => void
): PusherEventUnsubscriber {
  const channelName = pusherChannelName(userId);
  const channel = getPusherClient().subscribe(channelName);
  channel.bind(event, handler);
  channelRefCounts.set(
    channelName,
    (channelRefCounts.get(channelName) ?? 0) + 1
  );

  // Temporary diagnosis: confirm subscription attempts and their outcome.
  const refsAfter = channelRefCounts.get(channelName) ?? 0;
  console.log(
    `[DIAG][Pusher] subscribe: channel=${channelName} event=${event} refs=${refsAfter}`
  );
  channel.bind('pusher:subscription_succeeded', () => {
    console.log(`[DIAG][Pusher] subscription_succeeded: channel=${channelName}`);
  });
  channel.bind('pusher:subscription_error', (err: unknown) => {
    console.error(
      `[DIAG][Pusher] subscription_error: channel=${channelName}`,
      err
    );
  });

  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;

    const remaining = (channelRefCounts.get(channelName) ?? 1) - 1;

    if (remaining <= 0) {
      // Last consumer — nothing else is listening on this channel any more.
      channelRefCounts.delete(channelName);

      // Temporary diagnosis: capture why the channel is being torn down.
      console.log(
        `[DIAG][Pusher] unsubscribe (last consumer): channel=${channelName}`
      );
      channel.unbind_all();
      getPusherClient().unsubscribe(channelName);
    } else {
      // Other consumers remain — remove only this handler.
      channelRefCounts.set(channelName, remaining);
      console.log(
        `[DIAG][Pusher] unsubscribe (one consumer, refs left): channel=${channelName} refs=${remaining}`
      );
      channel.unbind(event, handler);
    }
  };
}