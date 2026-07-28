# Technical Requirements Document (TRD)

## 1BT Knowledge Management System (1BT-WIKI)

**Version:** 1.0
**Date:** July 2026
**Author:** Malindu (Full Stack Engineering Intern), 1 Billion Technology

---

## 1. Purpose

This document specifies the concrete technical implementation standards for 1BT-WIKI: tech stack, folder/file conventions, API contracts, data model, testing rules, CI/CD, environment configuration, and coding standards. It is the day-to-day reference for writing code in this repo. For system-level rationale (why the architecture looks like this), see the ARD. For product scope, see the PRD.

---

## 2. Tech Stack

| Layer                    | Technology                                                 |
| ------------------------ | ---------------------------------------------------------- |
| Frontend framework       | Next.js 16 (App Router) + TypeScript                       |
| Styling                  | Tailwind CSS v4                                            |
| Rich text editor         | TipTap (content stored as `JSONContent`, never HTML)       |
| Auth                     | Neon Auth (`@neondatabase/auth/next`, Better Auth-based)   |
| Backend framework        | Node.js + Express.js + TypeScript                          |
| JWT verification         | `jose` (local JWKS verification)                           |
| Database                 | Neon PostgreSQL (serverless, SSL required)                 |
| Hosting                  | Vercel (two projects: web, api)                            |
| Unit/integration testing | Jest                                                       |
| E2E testing              | Cypress                                                    |
| CI/CD                    | GitHub Actions                                             |
| Code quality             | SonarQube                                                  |
| AI                       | Gemini API                                                 |
| Monorepo tooling         | Turborepo + pnpm workspaces                                |
| AI coding assistant      | Cursor AI / Antigravity (`.cursor/` rules, agents, skills) |
| Animation                | GSAP (Navbar + loading/preloader only)                     |

---

## 3. Repository Structure

```
1BT-WIKI-PROJECT/
├── .cursor/{agents,rules,skills}/
├── .github/workflows/{deploy-api.yaml, deploy-web.yaml}
├── apps/
│   ├── api/src/
│   │   ├── app.ts               # exports appReady promise
│   │   ├── index.ts
│   │   ├── db/index.ts          # Neon pool, NODE_ENV=test guard
│   │   ├── errors/AppError.ts
│   │   ├── middleware/{auth.middleware.ts, rbac.middleware.ts, __tests__/}
│   │   ├── types/userTypes.ts   # AuthenticatedUser, UserProfile, capitalizeRole()
│   │   ├── controllers/
│   │   ├── services/{*, __tests__/}
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── __tests__/integration/
│   └── web/src/
│       ├── app/(dashboard)/...
│       ├── components/layout/{Navbar,Sidebar,UserAvatar}.tsx
│       └── lib/{auth/{client,server}.ts, api/client.ts, hooks/useUser.tsx}
├── packages/{eslint-config, typescript-config, ui}/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

Naming: `camelCase` for route/controller/service files (`userController.ts`); dot-separated for middleware (`auth.middleware.ts`, `rbac.middleware.ts`) — intentional, separate convention.

---

## 4. Backend Standards

### 4.1 Layered architecture (mandatory)

**Controller → Service → Repository.**

- Controller: parse request → call service → send response. No SQL, no business logic.
- Service: all business logic, calls repositories only, throws `AppError`.
- Repository: SQL only, returns entities or `null`, no HTTP concepts.

### 4.2 Error handling

Always use `AppError`, never `new Error()`:

```ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

Global error handler must be registered **inside** `appReady`, after all routes — registering it earlier causes `AppError` to render as HTML instead of JSON.

### 4.3 API conventions

- Prefix: `/api/v1/`
- Response envelope, always: `{ success: boolean, data?: T, error?: string }`
- Status codes: 200, 201, 400, 401, 403, 404, 500
- All requests/responses JSON; file uploads use `multipart/form-data`
- All imports use `.js` extension (ESM, `"type": "module"`)

### 4.4 Database access

- `db/index.ts` (not `src/db.ts`):

```ts
const isTest = process.env.NODE_ENV === 'test'
if (!process.env.DATABASE_URL && !isTest) {
  throw new Error('DATABASE_URL environment variable is not set')
}
export const pool = new Pool(isTest ? {} : { connectionString: ... })
```

This guard must never be removed — it's what allows tests to run without a real database.

### 4.5 Auth table

- Table: `neon_auth.user` (singular, not `users`). Columns: `id, name, email, emailVerified, image, createdAt, updatedAt, role, banned, banReason, banExpires`.
- No `contactDetails` column yet — omit from responses/ignore on update until added.
- Outward mapping: `image → avatarUrl`, `!banned → isActive`.
- Any role value read from the DB **must** pass through `capitalizeRole()` (`userTypes.ts`) before reaching `req.user` or any response body — never reimplement inline.

---

## 5. Auth Implementation Spec

See ARD Section 5 for architectural rationale. Implementation contract:

**Backend (`auth.middleware.ts`):**

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';
const JWKS = createRemoteJWKSet(
  new URL(`${NEON_AUTH_BASE_URL}/.well-known/jwks.json`)
);
const { payload } = await jwtVerify(token, JWKS, {
  issuer: new URL(NEON_AUTH_BASE_URL).origin,
  audience: new URL(NEON_AUTH_BASE_URL).origin,
});
```

- `payload.sub` → `userRepository.findById()` → `email`, `role`, `banned`.
- `null` result → 401. `banned === true` → 403.
- Attach `req.user = { userId, email, role }` (role capitalized).
- `NODE_ENV=test` guard at top of middleware reads `X-Test-User-Id`, `X-Test-User-Email`, `X-Test-User-Role` for integration tests.

**Frontend (`lib/api/client.ts`):**

- `apiFetch()` is the only sanctioned way to call the API; `getValidToken()` gets the token via `authClient.token()` (never `.getJWTToken()`, which doesn't exist).
- In-memory JWT cache keyed off the token's own `exp` claim, 60s safety buffer.
- JWT-shape validation (3 dot-separated segments) + retry-with-backoff (up to 3 attempts, ~1.2s worst case) to defend against the SDK's 60-second session cache.
- Single-retry-then-throw on 401.

**RBAC (`rbac.middleware.ts`):**

```ts
requireRole(...roles: UserRole[])
```

Reads `req.user.role`, returns 403 if not in the allowed list. Stable, untouched since introduction.

**Env vars (`apps/api/.env`):**

```
DATABASE_URL=
NEON_AUTH_BASE_URL=https://ep-green-breeze-aohz9nmm.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth
```

- JWKS fetch URL: `${NEON_AUTH_BASE_URL}/.well-known/jwks.json` (full path).
- Issuer/audience check: `new URL(NEON_AUTH_BASE_URL).origin` (origin only). Do not conflate these two derived values.

---

## 6. Data Model (Proposed — MVP 2 scope, not yet migrated)

> Auth-owned `neon_auth.user` table already exists (see Section 4.5). The following application tables are proposed based on SRS Section 3 and are the next piece of work; final DDL to be produced when Articles CRUD (MVP 2) begins.

| Table              | Key Columns                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `articles`         | `id, author_id (FK user), title, tags (text[]), body (jsonb), status (draft/pending/published/rejected), reject_reason, view_count, created_at, updated_at, deleted_at` |
| `article_likes`    | `id, article_id (FK), user_id (FK), created_at` — unique `(article_id, user_id)`                                                                                        |
| `article_comments` | `id, article_id (FK), user_id (FK), body, created_at, updated_at, deleted_at`                                                                                           |
| `tech_talks`       | `id, created_by (FK admin), title, presenters, tags, description, event_date, slides_url, video_url, status (draft/published), hidden, created_at, updated_at`          |
| `notifications`    | `id, recipient_id (FK user), type, message, related_entity_id, read_at, created_at`                                                                                     |
| `quizzes`          | `id, article_id (FK), config_snapshot (jsonb), generated_at`                                                                                                            |
| `quiz_questions`   | `id, quiz_id (FK), question, options (jsonb), correct_answer, type`                                                                                                     |
| `quiz_attempts`    | `id, quiz_id (FK), user_id (FK), answers (jsonb), score, correct_count, total_count, attempted_at`                                                                      |
| `quiz_config`      | singleton/admin-configurable: `enabled, questions_per_quiz, difficulty, question_types, daily_limit_per_user`                                                           |

Article status machine (owned by Malindu):

```
Draft → Pending (submit)
Pending → Published (Reviewer approves)
Pending → Rejected (Reviewer rejects + feedback)
Rejected → Draft (auto-reset on author edit)
Draft → deleted (author, own draft only)
Any → soft-deleted (Admin, deleted_at)
Any → hard-deleted (Admin only)
```

---

## 7. Frontend Standards

- Functional components only; Server Components by default, `'use client'` only when using hooks.
- `Link` from Next.js for all navigation — never raw `<a>` tags.
- Named exports for shared components; default exports for page components.
- No inline `style={{}}` — Tailwind utility classes only (arbitrary values like `bg-[#CC0000]` allowed if a token class doesn't resolve).
- Hand-coded SVGs only — no icon libraries (lucide, heroicons, etc.).
- GSAP restricted to Navbar and loading/preloader animations; no other animation library anywhere else.
- `data-testid` required on every interactive element.
- All authenticated API calls go through `apiFetch()`; current-user reads go through `useUser()` — never call `authClient.getSession()` or raw `fetch()` against the API from a feature component.

### Brand tokens (`globals.css` `@theme` block)

```
--color-brand-red:            #CC0000
--color-brand-red-hover:      #A80000
--color-brand-dark:           #1A1A1A
--color-brand-bg:             #F5F5F5
--color-brand-surface:        #FFFFFF
--color-brand-border:         #E5E7EB
--color-brand-text-primary:   #1A1A1A
--color-brand-text-secondary: #6B7280
--color-brand-hover:          #F0F0F0
```

### Layout

- Sidebar: fixed left, `w-60`, `bg-[#1A1A1A]`, full height
- Navbar: fixed top, `left-60`, `h-16`, white, `border-b`
- Main: `ml-60`, `pt-16`, `bg-[#F5F5F5]`, scrollable

---

## 8. Testing Standards

- Jest (unit/integration) + Cypress (E2E).
- AAA pattern (`// Arrange // Act // Assert`) on every test; `jest.clearAllMocks()` in every `beforeEach`.
- ESM mocking — `jest.unstable_mockModule()`, never `jest.mock()`:

```ts
await jest.unstable_mockModule('../../repositories/userRepository.js', () => ({
  default: { getAll: jest.fn(), create: jest.fn() },
}));
const { default: UserService } = await import('../userService.js');
```

- Mock **all** repositories and external SDKs (including `jose`'s `createRemoteJWKSet`/`jwtVerify`) — no real DB calls, no real network calls in unit tests.
- Locations:
  - Unit: `src/services/__tests__/[name].service.test.ts`
  - Integration: `src/__tests__/integration/[name].integration.test.ts`
  - Middleware: `src/middleware/__tests__/[name].test.ts`
  - Cypress: `apps/web/cypress/e2e/[feature].cy.ts`
- Integration test pattern: mock `db/index.js` and `auth.middleware.js` (via `X-Test-User-*` headers) before importing `app` (dynamic import), await `appReady` in `beforeAll`.
- Coverage target: ≥ 80% service layer.
- Test script (Windows-safe): `cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit`, run via `pnpm --filter api test` (don't re-append `--forceExit` on the command line).
- **Current status:** 64/64 tests passing across 7 suites (confirmed via real terminal output).

### 8.1 Auth-specific testing rule

Passing Jest is **necessary but not sufficient** for changes to `auth.middleware.ts`, `lib/api/client.ts`, or `lib/auth/*`. A live browser smoke test against running dev servers is required, with actual Network tab / console output reviewed, before the change is considered done. Any temporary debug page or test-only export created for verification must be deleted once confirmed — no debug scaffolding left in the codebase.

---

## 9. CI/CD

**`deploy-api.yaml`** — triggers: PR to `main`/`dev` + push to `dev` (paths: `apps/api/**`)
Steps: checkout → pnpm setup → node 24 → install → lint (`tsc --noEmit`) → test (`NODE_ENV=test`) → build.
Env: `DATABASE_URL` from secrets, `NODE_ENV: test`. JWKS verification is fully mocked in unit tests, so CI does not need outbound network access to Neon's real JWKS endpoint.

**`deploy-web.yaml`** — triggers: PR to `main`/`dev` + push to `dev` (paths: `apps/web/**`)
Steps: checkout → pnpm setup → node 24 → install → lint → build → Cypress E2E.

**Vercel:** two projects — `1bt-wiki-web` (`apps/web`), `1bt-wiki-api` (`apps/api`).
Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_WEB`, `VERCEL_PROJECT_ID_API`, `DATABASE_URL`.

---

## 10. Branching & Commit Conventions

```
main → production (Vercel auto-deploy, protected)
dev  → integration (protected)
feature/[member]-[task-id]-[slug] → individual work
```

Commit format: `[TASK-ID]-[OWNER] type(scope): short description`
Example: `[KB-01]-[MG] feat(articles): add article creation endpoint`

PR rules:

- `feature/* → dev`: 1 teammate approval + CI must pass
- `dev → main`: all 3 members agree + full CI must pass
- No self-merging
- Changes to shared infra files (e.g. `app.ts`) must be explicitly called out in the PR description

---

## 11. Non-Functional Requirements (Technical)

| Category        | Requirement                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | Homepage feed and article search return with minimal latency under normal load; AI quiz generation completes without blocking the UI                                                           |
| Security        | HTTPS/TLS everywhere; JWT expiry configurable (default 48h); uploads validated for type/size; RBAC on all endpoints; input sanitized against SQLi/XSS; secrets via env vars only               |
| Scalability     | Neon connection pooling; Vercel serverless scaling for API; CDN for static/media assets                                                                                                        |
| Maintainability | Layered backend / component-based frontend; consistent, documented, versioned REST APIs; unit + integration test coverage on all critical service-layer code; no hard-coded environment config |
| Usability       | Confirmation pop-ups on all irreversible actions (submit, approve, reject, delete); descriptive error messages; responsive on standard desktop/laptop sizes                                    |

---

## Appendix A — Auth Bug History (Read Before Modifying Auth Code)

| #   | Bug                               | Root Cause                                                                                    | Fix                                                              |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | Wrong auth provider               | Middleware validated Neon Auth tokens against Stack Auth                                      | Switched to `NEON_AUTH_BASE_URL`, removed `STACK_PROJECT_ID`     |
| 2   | Role not capitalized              | DB returns role lowercase                                                                     | Inline fix, later extracted to shared `capitalizeRole()` (Bug 7) |
| 3   | Banned check wrong source         | Trusted session data instead of fresh DB read                                                 | `userRepository.findById()` + `dbUser.banned` check              |
| 4   | Wrong introspection path          | Used Next.js-internal catch-all path instead of upstream `/get-session`                       | Fixed, then made moot by Bug 5                                   |
| 5   | Root architecture problem         | `session.session.token` is opaque, not a verifiable JWT                                       | Adopted JWT + local JWKS verification (current architecture)     |
| 6   | Issuer claim mismatch             | `issuer` option set to full `NEON_AUTH_BASE_URL` (with path); real `iss` claim is origin-only | `issuer: new URL(NEON_AUTH_BASE_URL).origin`                     |
| 7   | Role capitalization inconsistency | `profileService.ts` returned lowercase role while `req.user.role` was capitalized             | Extracted shared `capitalizeRole()`, used in both places         |

**Frontend SDK findings:**

- `authClient.getJWTToken()` does not exist (404s via an auto-generated broken route) — use `authClient.token()`.
- SDK has a 60-second session cache; `.token()` called shortly after `.getSession()` elsewhere can return stale data — mitigated via shape validation + retry, and by removing direct `.getSession()` calls from feature components in favor of `useUser()`.

**Verification method (repeat for any future auth change):** build a temporary debug page to manually inspect the raw JWT and a second page to prove `apiFetch()` end-to-end (including a manual 401-retry test), capture real Network tab/console evidence, then **delete both temporary pages** once confirmed.

**Lesson learned:** every fix in this area that "should have worked" based on reading types/docs still needed a real end-to-end browser test to confirm — Jest mocks can hide exactly this class of bug (wrong URL, wrong claim value, wrong SDK method, timing/caching issues).

---

## Appendix B — Open Technical Items

- Application data model (Section 6) is proposed, not yet migrated.
- Auth architecture pivot (Section 5 / Appendix A) confirmed working but not yet formally reviewed by Lahiru (Auth domain owner, on leave).
- Minor: GSAP `.active-indicator` target-not-found warning in `Sidebar.tsx` — not yet investigated, unrelated to auth, low priority.
