import { stubAuthSession } from '../support/auth';

const BUTTON = '[data-testid="scroll-to-top"]';
const TALL_CONTENT_ID = 'e2e-tall-content';

/**
 * The sign-in and dashboard pages are not tall enough to scroll on their own,
 * so append a tall block to the given scroll container to make it scrollable.
 */
function addTallContent(selector: string): void {
  cy.get(selector).then(($container) => {
    const tall = $container[0].ownerDocument.createElement('div');
    tall.id = TALL_CONTENT_ID;
    tall.style.height = '3000px';
    $container[0].appendChild(tall);
  });
}

describe('Scroll to top button', () => {
  it('appears after scrolling a public page, scrolls back to the top and hides', () => {
    stubAuthSession(null);
    cy.visit('/signin');
    addTallContent('body');

    cy.get(BUTTON).should('not.exist');

    cy.scrollTo(0, 800);
    cy.get(BUTTON).should('be.visible');

    cy.get(BUTTON).click();

    cy.window().its('scrollY').should('eq', 0);
    cy.get(BUTTON).should('not.exist');
  });

  it('stays hidden for small scrolls near the top of the page', () => {
    stubAuthSession(null);
    cy.visit('/signin');
    addTallContent('body');

    cy.scrollTo(0, 100);

    cy.get(BUTTON).should('not.exist');
  });

  it('works inside the dashboard scroll container', () => {
    stubAuthSession('Admin');
    cy.visitPage('/');
    cy.wait('@usersMe');
    cy.contains('h1', 'Admin Dashboard').should('be.visible');

    addTallContent('#main-scroll-container > div');
    cy.get('#main-scroll-container').should('exist');

    cy.get(BUTTON).should('not.exist');

    cy.get('#main-scroll-container').scrollTo(0, 800);
    cy.get(BUTTON).should('be.visible');

    cy.get(BUTTON).click();

    cy.get('#main-scroll-container')
      .invoke('scrollTop')
      .should('eq', 0);
    cy.get(BUTTON).should('not.exist');
  });
});
