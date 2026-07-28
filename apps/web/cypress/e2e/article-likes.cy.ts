import { stubAuthSession } from "../support/auth";

// LikeButton receives the article ID from the GET response.
// We intercept GET /api/v1/articles/1 to provide a mock article.
describe("Article likes", () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/articles/1', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: '1',
          title: 'Mock Article',
          body: { type: 'doc', content: [] },
          authorId: 'author-123',
          tags: [],
          status: 'Published',
          likeCount: 42,
          commentCount: 0,
          likedByMe: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    }).as('getArticle');
  });
  it("likes an article and increments the count", () => {
    stubAuthSession("User");

    cy.intercept("POST", "**/api/v1/articles/1/like", {
      statusCode: 200,
      body: { success: true, data: { liked: true }, message: "Article liked successfully" },
    }).as("likeArticle");

    cy.visitPage("/articles/1");
    cy.wait("@usersMe");

    cy.get('[data-testid="like-button"]').should("contain.text", "42");
    cy.get('[data-testid="like-button"]').click();

    cy.wait("@likeArticle");
    cy.get('[data-testid="like-button"]')
      .should("contain.text", "43")
      .and("have.attr", "aria-pressed", "true");
  });

  it("unlikes an article and decrements the count", () => {
    stubAuthSession("User");

    cy.intercept("POST", "**/api/v1/articles/1/like", {
      statusCode: 200,
      body: { success: true, data: { liked: true }, message: "Article liked successfully" },
    }).as("likeArticle");

    cy.visitPage("/articles/1");
    cy.wait("@usersMe");

    cy.get('[data-testid="like-button"]').click();
    cy.wait("@likeArticle");
    cy.get('[data-testid="like-button"]').should("have.attr", "aria-pressed", "true");

    cy.intercept("DELETE", "**/api/v1/articles/1/like", {
      statusCode: 200,
      body: { success: true, data: { liked: false }, message: "Article unliked successfully" },
    }).as("unlikeArticle");

    cy.get('[data-testid="like-button"]').click();
    cy.wait("@unlikeArticle");
    cy.get('[data-testid="like-button"]')
      .should("contain.text", "42")
      .and("have.attr", "aria-pressed", "false");
  });

  it("reverts and shows an error toast when liking fails", () => {
    stubAuthSession("User");

    cy.intercept("POST", "**/api/v1/articles/1/like", {
      statusCode: 403,
      body: { success: false, error: "Cannot like this article" },
    }).as("likeArticle");

    cy.visitPage("/articles/1");
    cy.wait("@usersMe");

    cy.get('[data-testid="like-button"]').click();
    cy.wait("@likeArticle");

    cy.get('[data-testid="error-toast"]').should("contain.text", "Cannot like this article");
    cy.get('[data-testid="like-button"]')
      .should("contain.text", "42")
      .and("have.attr", "aria-pressed", "false");
  });

  it("guards against double-clicks while a request is in flight", () => {
    stubAuthSession("User");

    cy.intercept("POST", "**/api/v1/articles/1/like", (req) => {
      req.reply({
        delay: 500,
        statusCode: 200,
        body: { success: true, data: { liked: true }, message: "Article liked successfully" },
      });
    }).as("likeArticle");

    cy.visitPage("/articles/1");
    cy.wait("@usersMe");

    cy.get('[data-testid="like-button"]').click();
    cy.get('[data-testid="like-button"]').should("be.disabled").click({ force: true });

    cy.wait("@likeArticle");
    cy.get("@likeArticle.all").should("have.length", 1);
    cy.get('[data-testid="like-button"]')
      .should("contain.text", "43")
      .and("not.be.disabled");
  });
});
