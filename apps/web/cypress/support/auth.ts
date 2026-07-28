export type StubRole = 'Admin' | 'User' | 'Reviewer' | null;

interface MockUserData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'Admin' | 'User' | 'Reviewer';
  isActive: boolean;
  createdAt: string;
}

// Cookie names Neon Auth's middleware (src/proxy.ts) looks for. The
// session_token value is never validated locally — the middleware only checks
// its presence, then trusts the signed session_data JWT (cookie cache fast
// path), so any non-empty value works as long as session_data verifies.
const SESSION_TOKEN_COOKIE = '__Secure-neon-auth.session_token';
const SESSION_DATA_COOKIE = '__Secure-neon-auth.local.session_data';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
};

const base64url = (value: object): string =>
  btoa(JSON.stringify(value))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

// Shape-only fake JWT — apps/web's apiFetch only checks JWT *shape* and the
// `exp` claim client-side (decodeJwtExpiry throws without it); real signature
// verification happens server-side in apps/api, which we bypass entirely by
// stubbing /users/me.
function fakeJwt(): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    sub: 'test-user-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return `${header}.${payload}.fake-signature`;
}

function mockUserFor(role: 'Admin' | 'User' | 'Reviewer'): MockUserData {
  return {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test.user@1billiontech.com',
    avatarUrl: null,
    role,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/**
 * Stubs the Neon Auth (better-auth) endpoints and the backend `/users/me`
 * call so the real app (real routing, real proxy.ts middleware, real
 * RoleGuard/UserProvider) can be driven through login/session/logout without
 * touching Google OAuth or a running apps/api.
 *
 * Client side (cy.intercept):
 *   POST /api/auth/sign-in/social -> { url, redirect } (url is required by the
 *                                    SDK's iframe/popup flow Cypress triggers)
 *   GET  /api/auth/get-session    -> { session, user } | null
 *   GET  /api/auth/token          -> { token } | 401
 *   POST /api/auth/sign-out       -> { success }
 *   GET  /api/v1/users/me         -> user profile | 401 (+ CORS headers, since
 *                                    apps/api on :5000 is cross-origin)
 *
 * Server side (cookies): proxy.ts checks the session server-side, which
 * cy.intercept cannot reach. For a non-null role this sets the two Neon Auth
 * cookies with a session_data JWT minted by the `mintSessionData` task
 * (signed with the app's own cookie secret), so the middleware's local cookie
 * cache validates it and allows protected routes without any upstream call.
 *
 * `role: null` stubs a logged-out session (no cookies -> middleware redirects
 * protected routes to /signin). The sign-out intercept flips the internal
 * state to logged-out itself, so after clicking logout the client-side stubs
 * report no session even though the cookies remain.
 */
export function stubAuthSession(initialRole: StubRole): void {
  let role = initialRole;

  cy.intercept('POST', '**/api/auth/sign-in/social', {
    statusCode: 200,
    // `url` feeds the SDK's iframe/popup flow; `redirect: false` stops the
    // SDK's core fetch plugin from also navigating the page to that URL.
    body: {
      url: 'https://accounts.google.com/o/oauth2/e2e-stub',
      redirect: false,
    },
  }).as('signInSocial');

  cy.intercept('GET', '**/api/auth/get-session*', (req) => {
    req.reply({
      statusCode: 200,
      body: role
        ? {
            session: { id: 'test-session-1', userId: 'test-user-1' },
            user: mockUserFor(role),
          }
        : null,
    });
  }).as('getSession');

  cy.intercept('GET', '**/api/auth/token', (req) => {
    if (role) {
      req.reply({ statusCode: 200, body: { token: fakeJwt() } });
    } else {
      req.reply({ statusCode: 401, body: {} });
    }
  }).as('getToken');

  cy.intercept('OPTIONS', '**/api/v1/users/me', {
    statusCode: 204,
    headers: CORS_HEADERS,
  });

  cy.intercept('GET', '**/api/v1/users/me', (req) => {
    if (role) {
      req.reply({
        statusCode: 200,
        headers: CORS_HEADERS,
        body: { success: true, data: mockUserFor(role) },
      });
    } else {
      req.reply({
        statusCode: 401,
        headers: CORS_HEADERS,
        body: { success: false, error: 'Authentication required' },
      });
    }
  }).as('usersMe');

  cy.intercept('POST', '**/api/auth/sign-out', (req) => {
    role = null;
    req.reply({ statusCode: 200, body: { success: true } });
  }).as('signOut');

  if (initialRole) {
    const user = mockUserFor(initialRole);
    cy.task<string>('mintSessionData', { user }).then((sessionDataJwt) => {
      cy.setCookie(SESSION_TOKEN_COOKIE, 'e2e-session-token', {
        secure: true,
        path: '/',
      });
      cy.setCookie(SESSION_DATA_COOKIE, sessionDataJwt, {
        secure: true,
        path: '/',
      });
    });
  }
}

/**
 * Cypress hosts the app in an iframe, so the Neon Auth SDK routes
 * `signIn.social` through its popup flow: fetch the OAuth URL, `window.open`
 * it, then wait for a same-origin `neon-auth:oauth-complete` postMessage with
 * a session verifier before navigating to the callbackURL. This stubs
 * `window.open` and fires that message, completing the handshake without a
 * real popup. Call after visiting the page that triggers sign-in.
 */
export function stubOAuthPopup(): void {
  cy.window().then((win) => {
    cy.stub(win, 'open').callsFake(() => {
      setTimeout(() => {
        win.dispatchEvent(
          new win.MessageEvent('message', {
            data: {
              type: 'neon-auth:oauth-complete',
              verifier: 'e2e-verifier',
            },
            origin: win.location.origin,
          })
        );
      }, 50);
      return {
        closed: false,
        close: () => {},
        focus: () => {},
      } as unknown as Window;
    });
  });
}
