@echo off
set NODE_ENV=test
set E2E_TEST_MODE=true
set E2E_DATABASE_CONFIRMED=true
set CYPRESS_API_URL=http://localhost:5001/api/v1
set NEXT_PUBLIC_SERVER_URL=http://localhost:5001
set VERCEL_NEON_AUTH_COOKIE_SECRET=ci-only-e2e-cookie-secret-1bt-wiki-32c

echo Seeding DB...
call pnpm --filter api db:seed:e2e

echo Starting API...
start "API" /B pnpm --filter api dev:e2e

echo Starting Web...
start "Web" /B pnpm --filter web dev:e2e

echo Waiting for services...
call pnpm --filter web exec wait-on http://localhost:3000 http://localhost:5001/api/v1/health --timeout 60000

echo Running Cypress Run 1...
call pnpm --filter web exec cypress run --browser chrome --headless --spec cypress/e2e/article-lifecycle.cy.ts > run1.log 2>&1
echo Run 1 Exit Code: %ERRORLEVEL% >> results.log

echo Running Cypress Run 2...
call pnpm --filter web exec cypress run --browser chrome --headless --spec cypress/e2e/article-lifecycle.cy.ts > run2.log 2>&1
echo Run 2 Exit Code: %ERRORLEVEL% >> results.log

echo Running Cypress Run 3...
call pnpm --filter web exec cypress run --browser chrome --headless --spec cypress/e2e/article-lifecycle.cy.ts > run3.log 2>&1
echo Run 3 Exit Code: %ERRORLEVEL% >> results.log

echo Running Cypress Run 4...
call pnpm --filter web exec cypress run --browser chrome --headless --spec cypress/e2e/article-lifecycle.cy.ts > run4.log 2>&1
echo Run 4 Exit Code: %ERRORLEVEL% >> results.log

echo Running Cypress Run 5...
call pnpm --filter web exec cypress run --browser chrome --headless --spec cypress/e2e/article-lifecycle.cy.ts > run5.log 2>&1
echo Run 5 Exit Code: %ERRORLEVEL% >> results.log

echo Done.
