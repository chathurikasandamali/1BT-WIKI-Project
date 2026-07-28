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
const pusherClient =
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

export default pusherClient;
