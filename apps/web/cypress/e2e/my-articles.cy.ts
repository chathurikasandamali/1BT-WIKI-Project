import { stubAuthSession } from '../support/auth';

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'article-1',
    title: 'Getting Started with TypeScript',
    authorId: 'test-user-1',
    tags: ['typescript'],
    status: 'Published',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
    likeCount: 2,
    commentCount: 1,
    ...overrides,
  };
}

describe('My Articles page', () => {
  it("lists the signed-in user's articles and supports search and sort", () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/mine*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          articles: [
            makeArticle({
              id: 'a1',
              title: 'React Basics',
              status: 'Published',
            }),
            makeArticle({ id: 'a2', title: 'Node Deep Dive', status: 'Draft' }),
          ],
          total: 2,
          page: 1,
          limit: 20,
        },
      },
    }).as('articlesMine');

    cy.visitPage('/my-articles');
    cy.wait('@usersMe');
    cy.wait('@articlesMine');

    cy.get('[data-testid="article-card-a1"]').should('be.visible');
    cy.get('[data-testid="article-card-a2"]').should('be.visible');

    cy.get('[data-testid="article-search-input"]').type('react');
    cy.get('[data-testid="article-card-a1"]').should('be.visible');
    cy.get('[data-testid="article-card-a2"]').should('not.exist');

    cy.get('[data-testid="article-search-input"]').clear();
    cy.get('[data-testid="article-sort-select"]').select('title');
    cy.get('[data-testid^="article-card-"]')
      .first()
      .should('have.attr', 'data-testid', 'article-card-a2');
  });

  it('shows an empty state when the user has no articles', () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/mine*', {
      statusCode: 200,
      body: {
        success: true,
        data: { articles: [], total: 0, page: 1, limit: 20 },
      },
    }).as('articlesMine');

    cy.visitPage('/my-articles');
    cy.wait('@usersMe');
    cy.wait('@articlesMine');

    cy.get('[data-testid="my-articles-empty"]').should(
      'contain.text',
      "You haven't written any articles yet."
    );
  });

  it('prompts sign-in when there is no session', () => {
    stubAuthSession(null);

    // No session cookies -> proxy.ts middleware redirects server-side before
    // the page ever loads, so we can't use visitPage() (it asserts the URL
    // still matches the visited path).
    cy.visit('/my-articles');
    cy.url().should('include', '/signin');

    cy.contains('h1', 'Sign in to continue').should('be.visible');
  });

  it("author deletes own Draft and confirms, and cannot delete non-Draft", () => {
    stubAuthSession("User");

    cy.intercept("GET", "**/api/v1/articles/mine*", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          articles: [
            makeArticle({ id: "a1", title: "React Basics", status: "Published" }),
            makeArticle({ id: "a2", title: "Node Deep Dive", status: "Draft" }),
          ],
          total: 2,
          page: 1,
          limit: 20,
        },
      },
    }).as("articlesMine");

    cy.intercept("DELETE", "**/api/v1/articles/a2", {
      statusCode: 200,
      body: { success: true, data: null, message: 'Article deleted successfully' }
    }).as("deleteArticle");

    cy.visitPage("/my-articles");
    cy.wait("@usersMe");
    cy.wait("@articlesMine");

    // Cannot delete published
    cy.get('[data-testid="delete-article-a1"]').should('be.disabled');

    // Can delete draft
    cy.get('[data-testid="delete-article-a2"]').should('not.be.disabled').click();
    
    // Modal appears
    cy.contains("Delete Draft").should("be.visible");
    cy.contains("Are you sure you want to delete this draft?").should("be.visible");
    
    // Confirm delete
    cy.contains("button", "Delete").click();
    
    cy.wait("@deleteArticle");
    
    // Article a2 is removed from DOM
    cy.get('[data-testid="article-card-a2"]').should("not.exist");
    // Toast shows
    cy.get('[data-testid="success-toast"]').should('be.visible').and('contain.text', 'Article deleted successfully');
  });

  it("Admin sees hard-delete option and it actually removes the row", () => {
    stubAuthSession("Admin");

    cy.intercept("GET", "**/api/v1/articles/mine*", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          articles: [
            makeArticle({ id: "a1", title: "React Basics", status: "Published" }),
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      },
    }).as("articlesMine");

    cy.intercept("DELETE", "**/api/v1/articles/a1?hard=true", {
      statusCode: 200,
      body: { success: true, data: null, message: 'Article deleted successfully' }
    }).as("deleteArticle");

    cy.visitPage("/my-articles");
    cy.wait("@usersMe");
    cy.wait("@articlesMine");

    // Admin can delete published
    cy.get('[data-testid="delete-article-a1"]').should('not.be.disabled').click();
    
    // Modal appears
    cy.contains("Permanently Delete Article").should("be.visible");
    cy.contains("Are you sure you want to permanently delete this article?").should("be.visible");
    
    // Confirm delete
    cy.contains("button", "Delete").click();
    
    cy.wait("@deleteArticle").its("request.url").should("include", "hard=true");
    
    // Article a1 is removed from DOM
    cy.get('[data-testid="article-card-a1"]').should("not.exist");
    // Toast shows
    cy.get('[data-testid="success-toast"]').should('be.visible').and('contain.text', 'Article deleted successfully');
  });
});
