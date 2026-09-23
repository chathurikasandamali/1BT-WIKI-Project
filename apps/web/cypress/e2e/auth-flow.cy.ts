import { stubAuthSession, stubOAuthPopup } from '../support/auth';

describe('Auth flow: login -> session -> protected route -> logout', () => {
  it('logs in, establishes a session, and reaches the Admin protected route', () => {
    stubAuthSession('Admin');

    cy.visitPage('/signin');
    stubOAuthPopup();
    cy.get('button[aria-label="Get started with Google"]')
      .filter(':visible')
      .click();

    cy.wait('@signInSocial');
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.visitPage('/');
    cy.wait('@usersMe');
    cy.contains('h1', 'Admin Dashboard').should('be.visible');
  });

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
    cy.viewport(1280, 720);

    cy.visit('/');
    cy.location('pathname').should('eq', '/signin');

    cy.get('button[aria-label="1BT Wiki home"]').should('be.visible');
    cy.get('button[aria-label="Get started with Google"]').should('be.visible');
    cy.contains('h1', 'Admin Dashboard').should('not.exist');
  });

  it.skip('logs out and tears the session down, re-blocking the protected route', () => {
    stubAuthSession('Admin');

    cy.visitPage('/');
    cy.wait('@usersMe');
    cy.contains('h1', 'Admin Dashboard').should('be.visible');

    cy.get('[data-testid="user-account-trigger"]').click();
    cy.get('[data-testid="menu-item-sign-out"]').click();
    cy.wait('@signOut');
    cy.url().should('include', '/signin');

    cy.visitPage('/');
    cy.wait('@getToken');
    cy.contains('h2', "You don't have permission to view this page").should(
      'be.visible'
    );
    cy.contains('h1', 'Admin Dashboard').should('not.exist');
  });
});
