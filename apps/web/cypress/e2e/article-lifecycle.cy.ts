// We use a relative import for e2e-identities.js because the project's @/ alias
// strictly maps to apps/web/src in tsconfig.json. Cypress's default bundler does not
// natively support tsconfig paths without additional preprocessor dependencies, so
// adding a custom @e2e alias merely to hide this cross-workspace dependency is unwarranted.
import { E2E_AUTHOR, E2E_REVIEWER } from '../../../api/scripts/e2e-identities.js';
import {
  setE2EIdentity,
  registerE2EApiAuth,
  registerE2EFrontendAuthStubs,
  mintE2EFrontendSession,
  SESSION_TOKEN_COOKIE,
} from '../support/e2e-auth';

describe('Article lifecycle', () => {
  let createdArticleId: string | null = null;

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
      // 8. Assert that the request URL reached the configured E2E API origin.
      // Cypress.expose('apiUrl') is the Cypress-15 non-deprecated public config
      // API (replaces Cypress.env). In CI it resolves to http://localhost:5000/api/v1;
      // locally, set CYPRESS_API_URL=http://localhost:5001/api/v1 before running.
      const configuredApiUrl = Cypress.expose('apiUrl');
      expect(configuredApiUrl).to.be.a('string');
      const expectedApiUrl = new URL(configuredApiUrl as string);
      const actualRequestUrl = new URL(interception.request.url);
      expect(actualRequestUrl.origin).to.eq(expectedApiUrl.origin);
      expect(actualRequestUrl.pathname).to.eq('/api/v1/users/me');

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
    const articleContent = 'This draft was created by the Cypress article lifecycle test.';

    // Type the unique title and trigger the real blur behaviour
    cy.get('[data-cy="article-title-input"]').type(articleTitle, { delay: 0 }).blur();

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
    cy.intercept('PATCH', '**/api/v1/articles/*', (req) => {
      const bodyString = typeof req.body === 'string' 
        ? req.body 
        : JSON.stringify(req.body);
      if (bodyString.includes(articleContent)) {
        req.alias = 'finalArticleAutosave';
      }
    });

    cy.get('[data-cy="article-content-editor"]')
      .click()
      .type(articleContent, { delay: 0 });

    // 14. Wait for the real PATCH autosave request
    // The application has a 3000ms debounce, so we must allow a slightly longer timeout
    cy.wait('@finalArticleAutosave', { timeout: 10000 }).then((interception) => {
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
        expect(bodyStr).to.include(articleContent);
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
      cy.get('[data-cy="confirmation-modal"]')
        .filter(':visible')
        .within(() => {
          cy.get('[data-cy="confirm-submit-button"]').click();
        });

      // 19. Wait for the real submit request
      cy.wait('@submitArticle', { timeout: 10000 }).then((interception) => {
        // Assert Request
        expect(interception.request.method).to.eq('POST');
        let pathname = '';
        try {
          pathname = new URL(interception.request.url).pathname;
        } catch {
          pathname = interception.request.url.split('?')[0] ?? '';
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

      // 20. Success UI and Redirect
      cy.url().should('include', '/my-articles');
      cy.get(`[data-testid="article-card-${articleId}"]`)
        .should('be.visible')
        .and('contain.text', articleTitle);

      // 21. Verify duplicate submission proof
      cy.get('@submitArticle.all').should('have.length', 1);

      // ---------------------------------------------------------
      // REVIEWER PHASE
      // ---------------------------------------------------------

      // 22. Switch Identity securely inside the Cypress queue
      cy.then(() => {
        setE2EIdentity(E2E_REVIEWER);
      });

      // 23. Establish Reviewer Session
      cy.session(
        ['e2e-reviewer', E2E_REVIEWER.id],
        () => {
          mintE2EFrontendSession(E2E_REVIEWER);
        },
        {
          validate: () => {
            cy.getCookie(SESSION_TOKEN_COOKIE).should('exist');
          },
        }
      );

      // 24. Hard Navigation to Reviewer Approvals (Destroys stale React state)
      cy.visit('/reviewer/approvals');

      // 25. Verify real backend recognises E2E_REVIEWER
      cy.wait('@getReviewerUser').then((interception) => {
        const configuredApiUrl = Cypress.expose('apiUrl');
        expect(configuredApiUrl).to.be.a('string');
        const expectedApiUrl = new URL(configuredApiUrl as string);
        const actualRequestUrl = new URL(interception.request.url);
        expect(actualRequestUrl.origin).to.eq(expectedApiUrl.origin);
        expect(actualRequestUrl.pathname).to.eq('/api/v1/users/me');

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_REVIEWER.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_REVIEWER.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_REVIEWER.role);

        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body.success).to.eq(true);
        expect(interception.response?.body.data.id).to.eq(E2E_REVIEWER.id);
        expect(interception.response?.body.data.email).to.eq(E2E_REVIEWER.email);
        expect(interception.response?.body.data.role).to.eq('Reviewer');
      });

      // 26. Wait for Pending list request
      cy.wait('@getPendingArticles').then((interception) => {
        expect(interception.request.method).to.eq('GET');

        const reqUrl = new URL(interception.request.url);
        expect(reqUrl.pathname).to.eq('/api/v1/reviewer/articles/pending');
        expect(reqUrl.searchParams.get('page')).to.eq('1');
        expect(reqUrl.searchParams.get('limit')).to.eq('20');

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_REVIEWER.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_REVIEWER.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_REVIEWER.role);

        expect(interception.response?.statusCode).to.eq(200);
        const responseBody = interception.response?.body;
        expect(responseBody.success).to.eq(true);
        expect(responseBody.data.articles).to.be.an('array');

        interface PendingArticle {
          id: string;
          title: string;
          status: string;
        }

        // Locate our specific article in the backend response
        const foundArticle = responseBody.data.articles.find((a: PendingArticle) => a.id === articleId);
        if (!foundArticle) {
          throw new Error(
            `Article ID ${articleId} not found in /reviewer/articles/pending list.`
          );
        }
        expect(foundArticle.title).to.eq(articleTitle);
        expect(foundArticle.status).to.eq('Pending');
      });

      // 27. Assert RoleGuard / UI root
      cy.get('[data-testid="reviewer-approvals-page"]').should('be.visible');
      cy.url().should('include', '/reviewer/approvals');

      // 28. Exact UI Discovery
      cy.get(`[data-testid="article-card-${articleId}"]`)
        .should('be.visible')
        .within(() => {
          cy.contains(articleTitle).should('be.visible');
          cy.get(`[data-testid="view-article-${articleId}"]`)
            .should('exist')
            .and('have.attr', 'href', `/reviewer/approvals/${articleId}`)
            .click();
        });

      // 29. Wait for Reviewer Detail Request
      cy.wait('@getReviewerArticle').then((interception) => {
        expect(interception.request.method).to.eq('GET');

        let pathname = '';
        try {
          pathname = new URL(interception.request.url).pathname;
        } catch {
          pathname = interception.request.url.split('?')[0] ?? '';
        }
        expect(pathname).to.eq(`/api/v1/reviewer/articles/${articleId}`);

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_REVIEWER.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_REVIEWER.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_REVIEWER.role);

        expect(interception.response?.statusCode).to.eq(200);
        const responseBody = interception.response?.body;
        expect(responseBody.success).to.eq(true);
        expect(responseBody.data.id).to.eq(articleId);
        expect(responseBody.data.title).to.eq(articleTitle);
        expect(responseBody.data.status).to.eq('Pending');

        const bodyStr = JSON.stringify(responseBody.data.body);
        expect(bodyStr).to.include('Cypress article lifecycle test');
      });

      // 30. Assert Detail UI
      cy.get('[data-testid="review-article-page"]').should('be.visible');
      cy.location('pathname').should('eq', `/reviewer/approvals/${articleId}`);

      cy.contains(articleTitle).should('be.visible');
      cy.get('[data-testid="article-status-badge"]').should('contain.text', 'Pending');
      cy.get('[data-testid="review-article-content"]').should('contain.text', 'Cypress article lifecycle test');

      cy.get('[data-testid="approve-button"]').should('be.visible');
      cy.get('[data-testid="reject-button"]').should('exist');

      // 31. Approval modal flow
      cy.get('[data-testid="approve-button"]').click();
      cy.get('[data-cy="confirmation-modal"]')
        .filter(':visible')
        .should('contain.text', 'Approve & Publish Article');

      cy.get('[data-cy="confirmation-modal"]')
        .filter(':visible')
        .within(() => {
          cy.get('[data-cy="confirm-submit-button"]').click();
        });

      // 32. Approval request assertions
      cy.wait('@approveArticle').then((interception) => {
        expect(interception.request.method).to.eq('PATCH');

        let pathname = '';
        try {
          pathname = new URL(interception.request.url).pathname;
        } catch {
          pathname = interception.request.url.split('?')[0] ?? '';
        }
        expect(pathname).to.eq(`/api/v1/reviewer/articles/${articleId}/approve`);

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_REVIEWER.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_REVIEWER.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_REVIEWER.role);

        expect(interception.response?.statusCode).to.eq(200);
        const responseBody = interception.response?.body;
        expect(responseBody.success).to.eq(true);
        expect(responseBody.data.id).to.eq(articleId);
        expect(responseBody.data.status).to.eq('Published');
      });

      // 33. Assert exactly one approval request
      cy.get('@approveArticle.all').should('have.length', 1);

      // 35. Durable post-approval proof
      cy.location('pathname').should('eq', '/reviewer/approvals');
      cy.get('[data-testid="reviewer-approvals-page"]').should('be.visible');

      // Wait for the UI to update and remove the approved article card
      // This ensures the post-approval data fetch has completed.
      cy.get(`[data-testid="article-card-${articleId}"]`).should('not.exist');

      // Now wait for the background revalidation request to complete before inspecting it
      cy.get('@getPendingArticles.all').should((interceptions) => {
        const completedInterceptions = (interceptions as import('cypress/types/net-stubbing').Interception[]).filter(i => i.response);
        expect(completedInterceptions.length).to.be.greaterThan(0, 'No completed getPendingArticles requests found');
        
        const lastInterception = completedInterceptions[completedInterceptions.length - 1];
        expect(lastInterception.response?.statusCode).to.eq(200);
        
        const responseBody = lastInterception.response?.body;
        expect(responseBody.success).to.eq(true);
        expect(responseBody.data.articles).to.be.an('array');

        interface PendingArticle {
          id: string;
        }

        const hasApprovedArticle = responseBody.data.articles.some((a: PendingArticle) => a.id === articleId);
        expect(hasApprovedArticle).to.eq(false, 'The approved article should no longer be in the pending list');
      });

      // ---------------------------------------------------------
      // AUTHOR PHASE - PUBLISHED ARTICLE VERIFICATION
      // ---------------------------------------------------------

      cy.then(() => {
        setE2EIdentity(E2E_AUTHOR);
      });

      cy.session(
        ['e2e-author-phase-2', E2E_AUTHOR.id],
        () => {
          mintE2EFrontendSession(E2E_AUTHOR);
        },
        {
          validate: () => {
            cy.getCookie(SESSION_TOKEN_COOKIE).should('exist');
          },
        }
      );

      // Hard Navigation to reset React state
      cy.visit('/articles');

      cy.wait('@getCurrentUser').then((interception) => {
        const configuredApiUrl = Cypress.expose('apiUrl');
        expect(configuredApiUrl).to.be.a('string');
        const expectedApiUrl = new URL(configuredApiUrl as string);
        const actualRequestUrl = new URL(interception.request.url);
        expect(actualRequestUrl.origin).to.eq(expectedApiUrl.origin);
        expect(actualRequestUrl.pathname).to.eq('/api/v1/users/me');

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_AUTHOR.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_AUTHOR.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_AUTHOR.role);

        expect(interception.response?.statusCode).to.eq(200);
        expect(interception.response?.body.success).to.eq(true);
        expect(interception.response?.body.data.id).to.eq(E2E_AUTHOR.id);
        expect(interception.response?.body.data.email).to.eq(E2E_AUTHOR.email);
        expect(interception.response?.body.data.role).to.eq('User');
      });

      cy.get('[data-testid="search-input"][placeholder="Search by title..."]').type(articleTitle, { delay: 0 });

      cy.wait('@searchPublishedArticles').then((interception) => {
        expect(interception.request.method).to.eq('GET');
        const reqUrl = new URL(interception.request.url);
        expect(reqUrl.pathname).to.eq('/api/v1/articles');
        expect(reqUrl.searchParams.get('search')).to.eq(articleTitle);
        // actual page, limit, sort and order parameters match current frontend behaviour
        expect(reqUrl.searchParams.get('page')).to.eq('1');
        expect(reqUrl.searchParams.get('limit')).to.eq('12');
        expect(reqUrl.searchParams.get('sort')).to.eq('createdAt');
        expect(reqUrl.searchParams.get('order')).to.eq('desc');

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_AUTHOR.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_AUTHOR.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_AUTHOR.role);

        expect(interception.response?.statusCode).to.eq(200);
        const responseBody = interception.response?.body;
        expect(responseBody.success).to.eq(true);
        expect(responseBody.data.articles).to.be.an('array');

        interface PublishedArticle {
          id: string;
          title: string;
          status: string;
        }

        const publishedArticle = responseBody.data.articles.find(
          (article: PublishedArticle) => article.id === articleId
        );
        if (!publishedArticle) {
          throw new Error('Article was not found in published list');
        }

        expect(publishedArticle.id).to.eq(articleId);
        expect(publishedArticle.title).to.eq(articleTitle);
        expect(publishedArticle.status).to.eq('Published');
      });

      cy.get(`[data-testid="article-card-${articleId}"]`)
        .should('be.visible')
        .within(() => {
          cy.contains(articleTitle).should('be.visible');
          cy.root().should('have.attr', 'href', `/articles/${articleId}`).click();
        });

      cy.wait('@getPublishedArticleDetail').then((interception) => {
        expect(interception.request.method).to.eq('GET');
        const reqUrl = new URL(interception.request.url);
        expect(reqUrl.pathname).to.eq(`/api/v1/articles/${articleId}`);

        expect(interception.request.headers['x-test-user-id']).to.eq(E2E_AUTHOR.id);
        expect(interception.request.headers['x-test-user-email']).to.eq(E2E_AUTHOR.email);
        expect(interception.request.headers['x-test-user-role']).to.eq(E2E_AUTHOR.role);

        expect(interception.response?.statusCode).to.eq(200);
        const responseBody = interception.response?.body;
        expect(responseBody.success).to.eq(true);
        expect(responseBody.data.id).to.eq(articleId);
        expect(responseBody.data.title).to.eq(articleTitle);
        expect(responseBody.data.status).to.eq('Published');

        const bodyStr = JSON.stringify(responseBody.data.body);
        expect(bodyStr).to.include(articleContent);
      });

      cy.location('pathname').should('eq', `/articles/${articleId}`);
      cy.get('h1').contains(articleTitle).should('be.visible');
      cy.get('[data-testid="article-content"]').should('contain.text', articleContent);

      cy.get('@getPublishedArticleDetail.all').then((interceptions) => {
        expect(interceptions.length).to.be.greaterThan(0);

        const successfulRequest = interceptions.find((interception) => {
          const response = interception.response;

          if (
            response?.statusCode === 200 &&
            response.body?.success === true &&
            response.body?.data?.id === articleId &&
            response.body?.data?.status === 'Published'
          ) {
            const bodyStr = JSON.stringify(response.body?.data?.body);
            return bodyStr.includes(articleContent);
          }
          return false;
        });

        expect(successfulRequest).to.not.equal(undefined);
      });
    });
  });

  after(() => {
    if (createdArticleId) {
      cy.then(() => {
        expect(createdArticleId).to.be.a('string').and.not.equal('');

        const apiUrl = Cypress.expose('apiUrl');
        const cleanupUrl = `${apiUrl}/e2e/articles/${createdArticleId}`;

        cy.request({
          method: 'DELETE',
          url: cleanupUrl,
          headers: {
            'x-test-user-id': E2E_AUTHOR.id,
            'x-test-user-email': E2E_AUTHOR.email,
            'x-test-user-role': E2E_AUTHOR.role,
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.success).to.eq(true);
          expect(response.body.data.articleId).to.eq(createdArticleId);
          expect(response.body.data.verifiedAbsent).to.eq(true);

          if (response.body.data.alreadyAbsent) {
            expect(response.body.data.articleDeleteCount).to.eq(0);
          } else {
            expect(response.body.data.articleDeleteCount).to.eq(1);
          }
        });
      });
    }
  });
});
