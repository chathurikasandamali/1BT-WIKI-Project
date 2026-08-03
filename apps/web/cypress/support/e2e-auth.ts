// apps/web/cypress/support/e2e-auth.ts

export type E2ERole = 'User' | 'Reviewer';

export interface E2ETestIdentity {
  id: string;
  email: string;
  role: E2ERole;
}

export const SESSION_TOKEN_COOKIE = '__Secure-neon-auth.session_token';
export const SESSION_DATA_COOKIE = '__Secure-neon-auth.local.session_data';

// Module-level state for the currently active identity
let currentIdentity: E2ETestIdentity | null = null;

/**
 * Sets the active E2E identity for subsequent API calls and frontend auth stubs.
 * (Always-run setup: call outside cy.session)
 */
export function setE2EIdentity(identity: E2ETestIdentity | null): void {
  currentIdentity = identity;
}

/**
 * Intercepts all outgoing calls to the backend API and attaches the required
 * test-auth headers matching the currently active identity.
 *
 * This intercept must be registered once per test (outside cy.session).
 */
export function registerE2EApiAuth(): void {
  cy.intercept('**/api/v1/**', (req) => {
    // If it's a preflight OPTIONS request, let it pass normally
    if (req.method === 'OPTIONS') {
      req.continue();
      return;
    }

    if (!currentIdentity) {
      throw new Error(
        'E2E API Auth Guard: Request made to /api/v1/** but no E2E identity has been set. ' +
        'Call setE2EIdentity() before making backend API requests.'
      );
    }

    req.headers['x-test-user-id'] = currentIdentity.id;
    req.headers['x-test-user-email'] = currentIdentity.email;
    req.headers['x-test-user-role'] = currentIdentity.role;

    // Dynamically alias specific endpoints for observers
    let pathname = '';
    try {
      pathname = new URL(req.url).pathname;
    } catch {
      // Fallback if URL parsing fails (e.g. relative path on same domain)
      pathname = req.url.split('?')[0] ?? '';
    }

    if (req.method === 'GET' && pathname.includes('/api/v1/users/me')) {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      req.alias = currentIdentity.role === 'Reviewer' ? 'getReviewerUser' : 'getCurrentUser';
    } else if (req.method === 'POST' && pathname.match(/^\/api\/v1\/articles\/?$/)) {
      req.alias = 'createArticle';
    } else if (req.method === 'PATCH' && pathname.match(/^\/api\/v1\/articles\/[^/]+$/)) {
      req.alias = 'updateArticle';
    } else if (req.method === 'POST' && pathname.match(/^\/api\/v1\/articles\/[^/]+\/submit\/?$/)) {
      req.alias = 'submitArticle';
    } else if (req.method === 'GET' && /^\/api\/v1\/reviewer\/articles\/pending\/?$/.test(pathname)) {
      req.alias = 'getPendingArticles';
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
    } else if (req.method === 'GET' && /^\/api\/v1\/reviewer\/articles\/[^/]+\/?$/.test(pathname)) {
      req.alias = 'getReviewerArticle';
    } else if (req.method === 'PATCH' && /^\/api\/v1\/reviewer\/articles\/[^/]+\/approve\/?$/.test(pathname)) {
      req.alias = 'approveArticle';
    } else if (req.method === 'GET' && /^\/api\/v1\/articles\/?$/.test(pathname)) {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      const search = new URL(req.url).searchParams.get('search');
      if (search && search.trim() !== '') {
        req.alias = 'searchPublishedArticles';
      } else {
        req.alias = 'getPublishedArticles';
      }
    } else if (req.method === 'GET' && /^\/api\/v1\/articles\/(?!mine\b)[^/]+\/?$/.test(pathname)) {
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      req.alias = 'getPublishedArticleDetail';
    }

    // Continue the request to the real backend
    req.continue();
  }).as('e2eApiGuard');
}

// ─────────────────────────────────────────────────────────────────────────────
// Frontend Session Stubs
// ─────────────────────────────────────────────────────────────────────────────

const base64url = (value: object): string =>
  btoa(JSON.stringify(value))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

// Shape-only fake JWT used by the frontend sdk
function fakeJwt(identity: E2ETestIdentity): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    sub: identity.id,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return `${header}.${payload}.fake-signature`;
}

/**
 * Stubs ONLY the Neon Auth (/api/auth/**) endpoints.
 * (Always-run setup: call outside cy.session)
 * Reads from `currentIdentity` dynamically so we don't have to re-register
 * intercepts when switching identities.
 */
export function registerE2EFrontendAuthStubs(): void {
  cy.intercept('POST', '**/api/auth/sign-in/social', {
    statusCode: 200,
    body: {
      url: 'https://accounts.google.com/o/oauth2/e2e-stub',
      redirect: false,
    },
  }).as('signInSocial');

  cy.intercept('GET', '**/api/auth/get-session*', (req) => {
    if (!currentIdentity) {
      req.reply({ statusCode: 200, body: null });
      return;
    }
    req.reply({
      statusCode: 200,
      body: {
        session: { id: `e2e-session-${currentIdentity.id}`, userId: currentIdentity.id },
        user: {
          id: currentIdentity.id,
          name: 'E2E User',
          email: currentIdentity.email,
          avatarUrl: null,
          role: currentIdentity.role,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      },
    });
  }).as('getSession');

  cy.intercept('GET', '**/api/auth/token', (req) => {
    if (!currentIdentity) {
      req.reply({ statusCode: 401, body: {} });
      return;
    }
    req.reply({ statusCode: 200, body: { token: fakeJwt(currentIdentity) } });
  }).as('getToken');

  cy.intercept('POST', '**/api/auth/sign-out', (req) => {
    setE2EIdentity(null);
    req.reply({ statusCode: 200, body: { success: true } });
  }).as('signOut');
}

/**
 * Mints the signed session_data JWT and sets the frontend cookies.
 * (Session-creation setup: usually called inside cy.session setup callback)
 */
export function mintE2EFrontendSession(identity: E2ETestIdentity): void {
  const user = {
    id: identity.id,
    name: 'E2E User',
    email: identity.email,
    avatarUrl: null,
    role: identity.role,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

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
