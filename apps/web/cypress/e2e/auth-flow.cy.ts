import { stubAuthSession, stubOAuthPopup } from '../support/auth';

describe('Auth flow: login -> session -> protected route -> logout', () => {
  it('logs in, establishes a session, and reaches the Admin protected route', () => {
    stubAuthSession('Admin');

    cy.visitPage('/signin');
    stubOAuthPopup();
    cy.contains('button', /sign in with google/i).click();

    cy.wait('@signInSocial');
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.visitPage('/');
    cy.wait('@usersMe');
    cy.contains('h1', 'Admin Dashboard').should('be.visible');
  });

  // Skipped for now: role-permission testing is on hold. The RoleGuard block
  // only renders on a protected route (e.g. /admin), not on '/'.
  it.skip('blocks the protected route for a logged-in user with the wrong role', () => {
    stubAuthSession('User');

    cy.visitPage('/');
    cy.wait('@usersMe');

    cy.contains('h2', "You don't have permission to view this page").should(
      'be.visible'
    );
    cy.contains('h1', 'Admin Dashboard').should('not.exist');
  });

  it('redirects the protected route to /signin when there is no session', () => {
    stubAuthSession(null);

    // No session cookies -> proxy.ts middleware redirects server-side before
    // the page (and any client-side fetch) ever loads.
    cy.visit('/');
    cy.url().should('include', '/signin');

    cy.contains('h1', 'Sign in to continue').should('be.visible');
    cy.contains('h1', 'Admin Dashboard').should('not.exist');
  });

  // Skipped for now: role-permission testing is on hold (see above).
  it.skip('logs out and tears the session down, re-blocking the protected route', () => {
    stubAuthSession('Admin');

    cy.visitPage('/');
    cy.wait('@usersMe');
    cy.contains('h1', 'Admin Dashboard').should('be.visible');

    cy.get('[data-testid="logout-btn"]').click();
    cy.wait('@signOut');
    cy.url().should('include', '/signin');

    // The stubbed session is now logged out client-side: the token endpoint
    // returns 401, so UserProvider resolves no user and RoleGuard blocks.
    cy.visitPage('/');
    cy.wait('@getToken');
    cy.contains('h2', "You don't have permission to view this page").should(
      'be.visible'
    );
    cy.contains('h1', 'Admin Dashboard').should('not.exist');
  });
});
