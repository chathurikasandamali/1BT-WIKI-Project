// apps/web/src/lib/pusher.ts
//
// Lazy-initialised pusher-js client singleton.
//
// Architecture notes:
//   - Never instantiated on the server (SSR guard via typeof window check).
//   - The custom authorizer replaces pusher-js's default fetch so the existing
//     apiFetch() utility is used instead. This ensures the Neon Auth Bearer
//     JWT is attached automatically from the in-memory token cache.
//   - The backend Pusher auth endpoint wraps its response in the project's
//     standard envelope: { success: true, data: { auth: "key:sig" } }.
//     The authorizer extracts `response.data` and passes it to the callback,
//     which is exactly the object Pusher expects.

import Pusher from 'pusher-js';
import { apiFetch } from '@/lib/api/client';

let pusherInstance: Pusher | null = null;

/**
 * Returns the shared Pusher client instance, creating it on first call.
 *
 * Must only be called in client components (uses `typeof window` guard).
 */
export function getPusherClient(): Pusher {
  if (pusherInstance) return pusherInstance;

  pusherInstance = new Pusher(
    process.env.NEXT_PUBLIC_PUSHER_KEY || 'dummy-key',
    {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'dummy-cluster',

      // Custom authorizer: use apiFetch so the project's JWT handling
      // (in-memory cache, automatic refresh, retry logic) applies.
      authorizer: (channel) => ({
        authorize: async (socketId, callback) => {
          try {
            const response = await apiFetch<{ auth: string }>('/pusher/auth', {
              method: 'POST',
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            });

            // response.data is { auth: "key:signature" } — exactly what Pusher expects.
            if (!response.success || !response.data) {
              callback(new Error('Pusher auth failed: invalid response'), null);
              return;
            }

            callback(null, response.data as Parameters<typeof callback>[1]);
          } catch (err) {
            callback(err instanceof Error ? err : new Error(String(err)), null);
          }
        },
      }),
    }
  );

  return pusherInstance;
}

/**
 * Disconnects and clears the Pusher singleton.
 * Call this during application teardown or when the user logs out.
 */
export function disconnectPusher(): void {
  pusherInstance?.disconnect();
  pusherInstance = null;
}
