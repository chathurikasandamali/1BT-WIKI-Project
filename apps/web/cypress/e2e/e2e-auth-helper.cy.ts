import { setE2EIdentity, registerE2EApiAuth, E2ETestIdentity } from '../support/e2e-auth';

const dummyAuthor: E2ETestIdentity = { id: 'author-123', email: 'author@test.com', role: 'User' };
const dummyReviewer: E2ETestIdentity = { id: 'reviewer-456', email: 'reviewer@test.com', role: 'Reviewer' };

describe('E2E Auth Helper', () => {
  beforeEach(() => {
    // Reset identity before each test to ensure isolation
    setE2EIdentity(null);
    registerE2EApiAuth();
  });

  it('fails if no identity is set', (done) => {
    // When the intercept throws, Cypress catches it as a test failure.
    // We listen to the runner's 'fail' event to pass the test if it's the expected error.
    cy.on('fail', (err) => {
      if (err.message.includes('no E2E identity has been set')) {
        done();
        return false;
      }
      throw err;
    });

    cy.visit('/');
    cy.window().then((win) => {
      win.fetch('/api/v1/dummy').catch(() => {});
    });
  });

  it('attaches headers for the active identity', () => {
    cy.then(() => setE2EIdentity(dummyAuthor));
    
    cy.visit('/');
    cy.window().then((win) => win.fetch('/api/v1/dummy').catch(() => {}));
    
    cy.wait('@e2eApiGuard').then((interception) => {
      expect(interception.request.headers['x-test-user-id']).to.eq(dummyAuthor.id);
      expect(interception.request.headers['x-test-user-email']).to.eq(dummyAuthor.email);
      expect(interception.request.headers['x-test-user-role']).to.eq(dummyAuthor.role);
    });
  });

  it('updates headers dynamically when identity is switched', () => {
    cy.then(() => setE2EIdentity(dummyAuthor));

    cy.visit('/');
    cy.window().then((win) => win.fetch('/api/v1/dummy2').catch(() => {}));
    
    cy.wait('@e2eApiGuard').then((interception) => {
      expect(interception.request.headers['x-test-user-role']).to.eq(dummyAuthor.role);
    });

    // Switch to reviewer without re-registering the main intercept
    cy.then(() => setE2EIdentity(dummyReviewer));

    cy.window().then((win) => win.fetch('/api/v1/dummy3').catch(() => {}));
    
    cy.wait('@e2eApiGuard').then((interception) => {
      expect(interception.request.headers['x-test-user-role']).to.eq(dummyReviewer.role);
    });
  });
});
