import { defineConfig } from 'cypress';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

interface MintSessionDataInput {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

/**
 * Same resolution order as src/lib/auth/server.ts: env var first, then the
 * apps/web/.env file the dev server loads, then the server's build fallback.
 * The minted session_data cookie is only valid if signed with the exact
 * secret the running dev server uses.
 */
function readCookieSecret(): string {
  if (process.env.VERCEL_NEON_AUTH_COOKIE_SECRET) {
    return process.env.VERCEL_NEON_AUTH_COOKIE_SECRET;
  }
  try {
    const env = readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    const match = env.match(/^VERCEL_NEON_AUTH_COOKIE_SECRET=(.*)$/m);
    const value = match?.[1]?.trim().replace(/^["']|["']$/g, '');
    if (value) return value;
  } catch {
    // fall through to the build-time fallback below
  }
  return 'dummy-secret-for-build-must-be-at-least-32-chars-long';
}

const base64url = (input: string): string =>
  Buffer.from(input).toString('base64url');

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    env: {
      apiUrl: 'http://localhost:5000/api/v1',
    },
    setupNodeEvents(on) {
      on('task', {
        /**
         * Mints the `__Secure-neon-auth.local.session_data` cookie value: an
         * HS256 JWT of { session, user } signed with the app's cookie secret.
         * Neon Auth's middleware validates this cookie locally (its session
         * cache fast path) without calling the upstream auth service, which
         * lets e2e tests establish a server-recognized session offline.
         */
        mintSessionData({ user }: MintSessionDataInput): string {
          const secret = readCookieSecret();
          const nowSeconds = Math.floor(Date.now() / 1000);
          const nowIso = new Date().toISOString();
          const inOneHourIso = new Date(
            Date.now() + 60 * 60 * 1000
          ).toISOString();

          const payload = {
            session: {
              id: 'e2e-session-1',
              userId: user.id,
              token: 'e2e-session-token',
              expiresAt: inOneHourIso,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            user: {
              ...user,
              updatedAt: nowIso,
            },
            iat: nowSeconds,
            exp: nowSeconds + 3600,
            sub: user.id,
          };

          const header = base64url(
            JSON.stringify({ alg: 'HS256', typ: 'JWT' })
          );
          const body = base64url(JSON.stringify(payload));
          const signature = createHmac('sha256', secret)
            .update(`${header}.${body}`)
            .digest('base64url');

          return `${header}.${body}.${signature}`;
        },
      });
    },
  },
});
