// We use a relative import for e2e-identities.js because the project's @/ alias 
// strictly maps to apps/web/src in tsconfig.json. Cypress's default bundler does not 
// natively support tsconfig paths without additional preprocessor dependencies, so 
// adding a custom @e2e alias merely to hide this cross-workspace dependency is unwarranted.
import { E2E_AUTHOR } from '../../../api/scripts/e2e-identities.js';
import {
  setE2EIdentity,
  registerE2EApiAuth,
  registerE2EFrontendAuthStubs,
  mintE2EFrontendSession,
  SESSION_TOKEN_COOKIE,
} from '../support/e2e-auth';

describe('Article lifecycle', () => {
  beforeEach(() => {
    // 1. Select E2E Author identity
    cy.then(() => setE2EIdentity(E2E_AUTHOR));
    
    // 2. Register the real Wiki API authentication interceptor
    // It will alias GET /api/v1/users/me as 'getCurrentUser'
    registerE2EApiAuth();
    
    // 3. Register required Neon Auth infrastructure stubs
    registerE2EFrontendAuthStubs();
  });

  it('authenticates the seeded author against the real API', () => {
    // 4. Create or restore the frontend session using cy.session()
    cy.session(
      ['e2e-author', E2E_AUTHOR.id],
      () => {
        mintE2EFrontendSession(E2E_AUTHOR);
      },
      {
        validate: () => {
          cy.getCookie(SESSION_TOKEN_COOKIE).should('exist');
        },
      }
    );

    // 5. Visit the verified authenticated route
    cy.visit('/');

    // 6 & 7. Wait for the real request and assert the backend response + outgoing headers
    cy.wait('@getCurrentUser').then((interception) => {
      // 8. Assert that the request URL went to port 5001 (E2E API) and not 5000 (Dev API)
      expect(interception.request.url).to.include(':5001');

      // Assert outgoing test headers
      expect(interception.request.headers['x-test-user-id']).to.eq(E2E_AUTHOR.id);
      expect(interception.request.headers['x-test-user-email']).to.eq(E2E_AUTHOR.email);
      expect(interception.request.headers['x-test-user-role']).to.eq(E2E_AUTHOR.role);
      
      // Assert real backend response
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body.success).to.eq(true);
      expect(interception.response?.body.data.id).to.eq(E2E_AUTHOR.id);
      expect(interception.response?.body.data.email).to.eq(E2E_AUTHOR.email);
      expect(interception.response?.body.data.role).to.eq(E2E_AUTHOR.role);
    });

    // 9. Assert the authenticated UI
    cy.get('[data-cy="user-avatar-name"]').should('be.visible').and('contain.text', 'E2E Author');
  });
});
