@echo off
set NODE_ENV=test
set E2E_TEST_MODE=true
set E2E_DATABASE_CONFIRMED=true
set CYPRESS_API_URL=http://localhost:5000/api/v1

echo Starting API...
start "API" /B pnpm --filter api dev

echo Starting Web...
start "Web" /B pnpm --filter web start

echo Waiting for services...
pnpm --filter web exec wait-on http://localhost:3000 http://localhost:5000/api/v1/health --timeout 60000

echo Running Cypress...
pnpm --filter web exec cypress run --browser chrome --headless --spec cypress/e2e/article-lifecycle.cy.ts

echo Done.
