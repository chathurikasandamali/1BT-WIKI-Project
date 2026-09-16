/// <reference types="node" />

// ---------------------------------------------------------------------------
// TEMPORARY dev-only diagnostic trigger — REMOVE AFTER DEBUGGING.
//
// Fires the REAL backend Pusher SDK to broadcast `role-changed` on a
// user's private channel, proving the chain:
//
//   Backend Pusher SDK -> Pusher service -> private-user-{userId}
//     -> current browser -> useRoleChangeLogout -> /signin
//
// Safety:
//   - Exits unless PUSHER_TEST_MODE=true (can never fire by accident).
//   - Exits if NODE_ENV=test (the test env uses a no-op Pusher stub, which
//     would report RESOLVED without anything actually reaching Pusher).
//   - Reuses the EXISTING pusherClient singleton — no second client, no
//     hardcoded credentials (env loaded from apps/api/.env via --env-file).
//   - No HTTP route, nothing exposed to any network.
//
// Usage (from apps/api):
//   pnpm exec cross-env PUSHER_TEST_MODE=true tsx --env-file=.env
//     scripts/trigger-role-change.ts
//   Optional overrides:
//     --userId=<uuid> --role=Admin|Reviewer|User
// ---------------------------------------------------------------------------

import pusherClient from '../src/v1/lib/pusherClient.js';
import {
  PUSHER_NOTIFICATION_EVENT,
  PUSHER_ROLE_CHANGED_EVENT,
  pusherChannelName,
} from '../src/v1/lib/pusherEvents.js';

const DEFAULT_USER_ID = '63e1275b-429a-4d4a-b644-f4980d75d469';
const DEFAULT_ROLE = 'Reviewer';
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_ROLES = ['Admin', 'Reviewer', 'User'];

const parseArg = (name: string): string | null => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
};

async function main(): Promise<void> {
  if (process.env.PUSHER_TEST_MODE !== 'true') {
    console.error(
      'ERROR: PUSHER_TEST_MODE must be "true" to run this temporary diagnostic trigger.'
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'test') {
    console.error(
      'ERROR: NODE_ENV=test uses the no-op Pusher stub and will not reach Pusher. Run without NODE_ENV=test.'
    );
    process.exit(1);
  }

  const userId =
    parseArg('userId') ?? process.env.PUSHER_TEST_USER_ID ?? DEFAULT_USER_ID;
  const role = parseArg('role') ?? process.env.PUSHER_TEST_ROLE ?? DEFAULT_ROLE;

  if (!UUID_REGEX.test(userId)) {
    console.error(`ERROR: Invalid userId "${userId}" (expected UUID).`);
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(
      `ERROR: Invalid role "${role}" (must be one of ${VALID_ROLES.join(', ')}).`
    );
    process.exit(1);
  }

  const channel = pusherChannelName(userId);

  // Minimal valid payload matching the frontend PusherNotificationPayload
  // shape consumed by the existing `notification:new` handler in
  // useNotifications.ts (id, recipientId, title, message, isRead, createdAt).
  const notificationPayload = {
    id: `diagnostic-notification-${Date.now()}`,
    recipientId: userId,
    title: 'Diagnostic Test Notification',
    message:
      'Temporary diagnostic event from trigger-role-change.ts — notification:new works.',
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  // ---- Trigger 1: notification:new (known working path) ----
  console.log('[DIAG][PusherTest] Triggering notification:new');
  console.log(`[DIAG][PusherTest] Triggering channel=${channel}`);
  console.log(`[DIAG][PusherTest] Event=${PUSHER_NOTIFICATION_EVENT}`);
  console.log(`[DIAG][PusherTest] Payload=${JSON.stringify(notificationPayload)}`);

  try {
    await pusherClient.trigger(
      channel,
      PUSHER_NOTIFICATION_EVENT,
      notificationPayload
    );
    console.log('[DIAG][PusherTest] Trigger RESOLVED');
    console.log('[DIAG][PusherTest] Trigger 1 RESOLVED (notification:new)');
  } catch (error) {
    console.error('[DIAG][PusherTest] Trigger REJECTED', error);
    console.error('[DIAG][PusherTest] Trigger 1 REJECTED (notification:new)', error);
    process.exitCode = 1;
  }

  // ---- Trigger 2: role-changed (suspected path) ----
  // Same client, same process, same channel — isolates the event-level compare.
  console.log('[DIAG][PusherTest] Trigger 2 firing role-changed');
  console.log(`[DIAG][PusherTest] Trigger 2 channel=${channel}`);
  console.log(`[DIAG][PusherTest] Trigger 2 Event=${PUSHER_ROLE_CHANGED_EVENT}`);
  console.log(`[DIAG][PusherTest] Trigger 2 Payload=${JSON.stringify({ role })}`);

  try {
    await pusherClient.trigger(channel, PUSHER_ROLE_CHANGED_EVENT, { role });
    console.log('[DIAG][PusherTest] Trigger 2 RESOLVED (role-changed)');
  } catch (error) {
    console.error(
      '[DIAG][PusherTest] Trigger 2 REJECTED (role-changed)',
      error
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[DIAG][PusherTest] Unexpected failure:', error);
  process.exitCode = 1;
});