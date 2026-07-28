describe('Baseline', () => {
  it('homepage loads without errors', () => {
    cy.visitPage('/');
    cy.get('main').should('be.visible');
  });

  it('API health check returns 200', () => {
    cy.request(`${Cypress.env('apiUrl')}/health`).then((response) => {
      expect(response.status).to.eq(200);
    });
  });
});
