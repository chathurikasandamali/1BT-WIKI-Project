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

  it('authenticates the author, creates a draft, and updates content', () => {
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
      expect(interception.request.headers['x-test-user-id']).to.eq(
        E2E_AUTHOR.id
      );
      expect(interception.request.headers['x-test-user-email']).to.eq(
        E2E_AUTHOR.email
      );
      expect(interception.request.headers['x-test-user-role']).to.eq(
        E2E_AUTHOR.role
      );

      // Assert real backend response
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body.success).to.eq(true);
      expect(interception.response?.body.data.id).to.eq(E2E_AUTHOR.id);
      expect(interception.response?.body.data.email).to.eq(E2E_AUTHOR.email);
      expect(interception.response?.body.data.role).to.eq(E2E_AUTHOR.role);
    });

    // 9. Assert the authenticated UI
    cy.get('[data-cy="user-avatar-name"]')
      .should('be.visible')
      .and('contain.text', 'E2E Author');

    // 10. Open new editor
    cy.visit('/editor');
    cy.get('[data-cy="article-title-input"]').should('be.visible');

    // 11. Create the draft
    const articleTitle = `Cypress Draft ${Date.now()}`;
    let createdArticleId: string | null = null;

    // Type the unique title and trigger the real blur behaviour
    cy.get('[data-cy="article-title-input"]').type(articleTitle).blur();

    // Wait for the real POST request
    cy.wait('@createArticle').then((interception) => {
      // Assert the real response based on the controller returning successResponse(article) with status 201
      expect(interception.response?.statusCode).to.eq(201);
      const responseData = interception.response?.body.data;
      expect(responseData.id).to.be.a('string').and.not.equal('');
      expect(responseData.title).to.eq(articleTitle);
      expect(responseData.status).to.eq('Draft');
      // Assert ownership if included in the response
      if (responseData.authorId) {
        expect(responseData.authorId).to.eq(E2E_AUTHOR.id);
      }

      // Store the returned ID
      createdArticleId = responseData.id;
    });

    // 12. Verify exactly one creation request occurred
    cy.get('@createArticle.all').should('have.length', 1);

    // 13. Update content
    cy.get('[data-cy="article-content-editor"]')
      .click()
      .type('This draft was created by the Cypress article lifecycle test.');

    // 14. Wait for the real PATCH autosave request
    // The application has a 3000ms debounce, so we must allow a slightly longer timeout
    cy.wait('@updateArticle', { timeout: 10000 }).then((interception) => {
      // Assert PATCH URL contains createdArticleId
      expect(interception.request.url).to.include(createdArticleId);
      // Assert successful response and persistence
      expect(interception.response?.statusCode).to.eq(200);
      const patchResponseData = interception.response?.body.data;
      expect(patchResponseData.id).to.eq(createdArticleId);
      expect(patchResponseData.status).to.eq('Draft');
      // Verify body persistence if returned in the DTO
      if (patchResponseData.body) {
        // TipTap JSON bodies have text inside nested nodes
        const bodyStr = JSON.stringify(patchResponseData.body);
        expect(bodyStr).to.include('Cypress article lifecycle test');
      } else {
        cy.log(
          'PATCH succeeded but body not returned in response DTO. Content persistence relies on status 200.'
        );
      }
    });

    // 15. Verify UI save state
    // We use the exact newly added data-cy attribute instead of a broad text match
    cy.get('[data-cy="save-status-indicator"]')
      .should('be.visible')
      .and('contain.text', 'Draft saved');

    // 16. Guard createdArticleId and narrow to local constant inside the command queue
    cy.then(() => {
      expect(createdArticleId).to.be.a('string').and.not.equal('');
      if (!createdArticleId) {
        throw new Error('Created article ID is unavailable before submission');
      }
      const articleId = createdArticleId;

      // 17. Open confirmation modal
      cy.get('[data-cy="submit-for-review-button"]').click();
      cy.get('[data-cy="confirmation-modal"]').should('be.visible');

      // 18. Confirm submission
      cy.get('[data-cy="confirm-submit-button"]').click();

      // 19. Wait for the real submit request
      cy.wait('@submitArticle', { timeout: 10000 }).then((interception) => {
        // Assert Request
        expect(interception.request.method).to.eq('POST');
        let pathname = '';
        try {
          pathname = new URL(interception.request.url).pathname;
        } catch {
          pathname = interception.request.url.split('?')[0];
        }
        expect(pathname).to.eq(`/api/v1/articles/${articleId}/submit`);

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_AUTHOR.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_AUTHOR.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_AUTHOR.role);
        // Request body assertion omitted (or relaxed) per user instructions for bodyless POSTs

        // Assert Response
        expect(interception.response?.statusCode).to.eq(200);
        const responseBody = interception.response?.body;
        expect(responseBody.success).to.eq(true);
        expect(responseBody.data.id).to.eq(articleId);
        expect(responseBody.data.status).to.eq('Pending');
        if (responseBody.data.title !== undefined) {
          expect(responseBody.data.title).to.eq(articleTitle);
        }
      });

      // 20. Verify success UI and redirect
      cy.get('[data-testid="success-toast"]').should('be.visible');
      cy.url().should('include', '/my-articles');

      // 21. Verify duplicate submission proof
      cy.get('@submitArticle.all').should('have.length', 1);
    });
  });
});
