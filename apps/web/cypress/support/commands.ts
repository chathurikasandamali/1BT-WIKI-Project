declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress requires global namespace augmentation for custom command types
  namespace Cypress {
    interface Chainable {
      visitPage(path: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('visitPage', (path: string) => {
  cy.visit(path);
  cy.url().should('include', path);
});

export {};
