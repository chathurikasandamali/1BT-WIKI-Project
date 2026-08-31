import { stubAuthSession } from '../support/auth';

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    articleId: 'a1',
    createdBy: 'other-user',
    body: 'Great read!',
    status: 'Approved',
    reviewedBy: null,
    reviewedAt: null,
    authorName: 'Other User',
    authorImage: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Article comments', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/articles/a1', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'a1',
          title: 'Mock Article',
          body: { type: 'doc', content: [] },
          authorId: 'author-123',
          tags: [],
          status: 'Published',
          likeCount: 0,
          commentCount: 2,
          likedByMe: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    }).as('getArticle');
  });
  it("lists comments and only shows edit/delete on the current user's own comment", () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/a1/comments', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          makeComment({
            id: 'mine',
            createdBy: 'test-user-1',
            authorName: 'Test User',
            body: 'My own comment',
          }),
          makeComment({
            id: 'theirs',
            createdBy: 'other-user',
            authorName: 'Other User',
            body: "Someone else's comment",
          }),
        ],
      },
    }).as('commentsList');

    cy.visitPage('/articles/a1');
    cy.wait('@usersMe');
    cy.wait('@commentsList');

    cy.contains('My own comment').scrollIntoView().should('be.visible');
    cy.contains("Someone else's comment").scrollIntoView().should('be.visible');
    cy.get('[data-testid="delete-comment-btn"]').should('have.length', 1);
    cy.get('[data-testid="edit-comment-btn"]').should('have.length', 1);
  });

  it('posts a new comment and shows it at the top of the list', () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/a1/comments', {
      statusCode: 200,
      body: { success: true, data: [] },
    }).as('commentsList');

    cy.intercept('POST', '**/api/v1/articles/a1/comments', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          id: 'new-1',
          articleId: 'a1',
          createdBy: 'test-user-1',
          body: 'This is a great article!',
          status: 'Pending',
          reviewedBy: null,
          reviewedAt: null,
          createdAt: '2026-01-10T00:00:00.000Z',
          updatedAt: '2026-01-10T00:00:00.000Z',
        },
      },
    }).as('createComment');

    cy.visitPage('/articles/a1');
    cy.wait('@usersMe');
    cy.wait('@commentsList');

    cy.get('[data-testid="comments-empty"]')
      .scrollIntoView()
      .should('be.visible');

    cy.get("textarea[placeholder='Add a comment...']").type(
      'This is a great article!'
    );
    cy.contains('button', 'Post Comment').click();

    cy.wait('@createComment');
    cy.contains('This is a great article!')
      .scrollIntoView()
      .should('be.visible');
    cy.get('[data-testid="success-toast"]').should(
      'contain.text',
      'pending approval'
    );
    // A freshly posted comment is only visible to its own author (via this
    // optimistic update) until an Admin approves it; a second GET (as would
    // happen for another visitor) would omit it entirely since the backend
    // filters non-Approved comments to the requester only.
    cy.get('[data-testid="comment-status-badge"]').should(
      'contain.text',
      'Pending approval'
    );
  });

  it('edits an own comment and shows the updated body', () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/a1/comments', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          makeComment({
            id: 'mine',
            createdBy: 'test-user-1',
            authorName: 'Test User',
            body: 'Old body',
          }),
        ],
      },
    }).as('commentsList');

    cy.intercept('PATCH', '**/api/v1/articles/a1/comments/mine', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'mine',
          articleId: 'a1',
          createdBy: 'test-user-1',
          body: 'Updated body',
          status: 'Pending',
          reviewedBy: null,
          reviewedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      },
    }).as('editComment');

    cy.visitPage('/articles/a1');
    cy.wait('@usersMe');
    cy.wait('@commentsList');

    cy.get('[data-testid="edit-comment-btn"]').click();
    cy.get('[data-testid="edit-comment-input"]').clear().type('Updated body');
    cy.get('[data-testid="save-edit-comment-btn"]').click();

    cy.wait('@editComment');
    cy.contains('Updated body').should('be.visible');
    cy.get('[data-testid="edit-comment-input"]').should('not.exist');
  });

  it('keeps the edit form open and shows an error when editing fails', () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/a1/comments', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          makeComment({
            id: 'mine',
            createdBy: 'test-user-1',
            authorName: 'Test User',
            body: 'Old body',
          }),
        ],
      },
    }).as('commentsList');

    cy.intercept('PATCH', '**/api/v1/articles/a1/comments/mine', {
      statusCode: 403,
      body: {
        success: false,
        error: 'Only the comment owner can edit this comment',
      },
    }).as('editComment');

    cy.visitPage('/articles/a1');
    cy.wait('@usersMe');
    cy.wait('@commentsList');

    cy.get('[data-testid="edit-comment-btn"]').click();
    cy.get('[data-testid="edit-comment-input"]').clear().type('Attempted edit');
    cy.get('[data-testid="save-edit-comment-btn"]').click();

    cy.wait('@editComment');
    cy.get('[data-testid="edit-comment-error"]').should(
      'contain.text',
      'Only the comment owner can edit this comment'
    );
    cy.get('[data-testid="edit-comment-input"]').should(
      'have.value',
      'Attempted edit'
    );
  });

  it('deletes an own comment and removes it from the list', () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/a1/comments', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          makeComment({
            id: 'mine',
            createdBy: 'test-user-1',
            authorName: 'Test User',
            body: 'Delete me',
          }),
        ],
      },
    }).as('commentsList');

    cy.intercept('DELETE', '**/api/v1/articles/a1/comments/mine', {
      statusCode: 200,
      body: { success: true, data: null },
    }).as('deleteComment');

    cy.visitPage('/articles/a1');
    cy.wait('@usersMe');
    cy.wait('@commentsList');

    cy.get('[data-testid="delete-comment-btn"]').click();
    cy.contains('button', 'Delete').click();

    cy.wait('@deleteComment');
    cy.get('[data-testid="comments-empty"]').should('be.visible');
  });

  it('keeps the comment and shows an error toast when deleting fails', () => {
    stubAuthSession('User');

    cy.intercept('GET', '**/api/v1/articles/a1/comments', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          makeComment({
            id: 'mine',
            createdBy: 'test-user-1',
            authorName: 'Test User',
            body: 'Keep me',
          }),
        ],
      },
    }).as('commentsList');

    cy.intercept('DELETE', '**/api/v1/articles/a1/comments/mine', {
      statusCode: 403,
      body: {
        success: false,
        error: 'Only the comment owner can delete this comment',
      },
    }).as('deleteComment');

    cy.visitPage('/articles/a1');
    cy.wait('@usersMe');
    cy.wait('@commentsList');

    cy.get('[data-testid="delete-comment-btn"]').click();
    cy.contains('button', 'Delete').click();

    cy.wait('@deleteComment');
    cy.get('[data-testid="error-toast"]').should(
      'contain.text',
      'Only the comment owner can delete this comment'
    );
    cy.contains('Keep me').should('be.visible');
  });
});
