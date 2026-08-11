// apps/api/src/v1/lib/pusherClient.ts
//
// Pusher server SDK singleton.
// Credentials are read exclusively from environment variables — never hardcoded.
// Pattern mirrors b2Client.ts in the same directory.

import Pusher from 'pusher';

const {
  NODE_ENV,
  PUSHER_APP_ID,
  PUSHER_KEY,
  PUSHER_SECRET,
  PUSHER_CLUSTER,
} = process.env;

// In the test environment the real Pusher client is never used — each test
// file mocks notificationService (or pusherClient directly). Exporting a no-op
// stub here prevents the module-level throw from cascading into every
// integration test suite and causing routes to never mount (all-404 failures).
if (NODE_ENV !== 'test') {
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    throw new Error(
      'Missing one or more required Pusher environment variables (PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER).'
    );
  }
}

// Build a real client in production/development; a lightweight no-op stub in
// test so that importing this module never throws without credentials.
const rawClient =
  NODE_ENV === 'test'
    ? ({
        trigger: () => Promise.resolve(),
      } as unknown as Pusher)
    : new Pusher({
        appId: PUSHER_APP_ID!,
        key: PUSHER_KEY!,
        secret: PUSHER_SECRET!,
        cluster: PUSHER_CLUSTER!,
        useTLS: true,
      });

// Ensure the exported client exposes `authorizeChannel` which the controller
// expects. The official Pusher server SDK exposes `authenticate(socketId, channel)`;
// provide an `authorizeChannel` alias that calls `authenticate`. For the test
// stub, expose a no-op `authorizeChannel` so tests that import the module
// won't receive "is not a function" errors.
const pusherClient: unknown = rawClient;

try {
  // If the real SDK is present, alias authenticate -> authorizeChannel
  // @ts-expect-error dynamic augmentation
  if ((rawClient as any).authenticate && !(rawClient as any).authorizeChannel) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rawClient as any).authorizeChannel = (rawClient as any).authenticate.bind(rawClient as any);
  }
} catch {
  // ignore augmentation failures
}

// For the test stub (or any client missing authorizeChannel), add a safe stub.
if (!(pusherClient as any).authorizeChannel) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pusherClient as any).authorizeChannel = (_socketId: string, _channel: string) => ({
    auth: 'test-placeholder',
  });
}

export default pusherClient as Pusher;
