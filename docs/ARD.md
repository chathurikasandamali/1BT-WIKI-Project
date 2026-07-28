# Architecture Requirements Document (ARD)

## 1BT Knowledge Management System (1BT-WIKI)

**Version:** 1.0
**Date:** July 2026
**Author:** Malindu (Full Stack Engineering Intern), 1 Billion Technology

---

## 1. Purpose

This document defines the system architecture for 1BT-WIKI: how the frontend, backend, database, and third-party services (Neon Auth, Gemini API) fit together, how requests are authenticated end-to-end, how the codebase is organized, and the architectural constraints every contributor must follow.

---

## 2. Architectural Style

- **Monorepo** (Turborepo + pnpm workspaces) housing two deployable apps (`apps/web`, `apps/api`) and shared packages (`packages/eslint-config`, `packages/typescript-config`, `packages/ui`).
- **Backend:** Layered architecture — **Controller → Service → Repository**. Controllers own HTTP concerns only; Services own business logic and throw `AppError`; Repositories own SQL only and return entities or `null`.
- **Frontend:** Component-based architecture on Next.js 16 App Router, Server Components by default, Client Components only where interactivity/hooks are required.
- **Deployment:** Two independent Vercel projects (web, api) for independent scaling and deploys.
- **Auth:** Delegated, stateless — Neon Auth (Better Auth) issues JWTs; the API verifies them locally via JWKS (no per-request network round-trip to the auth provider).

---

## 3. High-Level System Diagram (textual)

```
┌─────────────────────┐        JWT (Bearer)        ┌──────────────────────┐
│   apps/web           │ ─────────────────────────▶ │   apps/api             │
│   Next.js 16 App     │                             │   Express.js           │
│   Router (Vercel)    │ ◀───────────────────────── │   (Vercel Functions)   │
└─────────┬────────────┘        JSON responses       └──────────┬────────────┘
          │                                                       │
          │ authClient.token()                                   │ jose + JWKS
          ▼                                                       ▼
┌─────────────────────┐                             ┌──────────────────────┐
│ Neon Auth            │◀────────────────────────── │ Neon PostgreSQL        │
│ (Better Auth,        │   findById(sub) lookups     │ (neon_auth.user +      │
│ Google SSO, JWKS)     │─────────────────────────▶ │ app tables)             │
└─────────────────────┘                             └──────────────────────┘

                         ┌──────────────────────┐
                         │ Gemini API             │  ← called from apps/api
                         │ (AI quiz generation)   │    (Lahiru's domain)
                         └──────────────────────┘
```

---

## 4. Component Architecture

### 4.1 Frontend (`apps/web`)

- **App Router structure:** `(dashboard)` route group provides the authenticated shell (Sidebar, Navbar, notification bell) wrapping all authenticated pages.
- **Auth client layer (`lib/auth/`):**
  - `client.ts` — `createAuthClient()` from `@neondatabase/auth/next`, no arguments.
  - `server.ts` — `createNeonAuth()` for server components.
- **API client layer (`lib/api/client.ts`):** the _only_ sanctioned way to call the Express API. Provides `apiFetch()` and `getValidToken()`:
  - In-memory JWT cache (never localStorage), expiry read from the token's own `exp` claim with a 60s safety buffer.
  - JWT-shape validation (3 dot-separated parts) with retry-with-backoff to defend against the Neon Auth SDK's 60-second session cache returning stale session-shaped data instead of a fresh JWT.
  - Single-retry-then-throw on HTTP 401.
- **Shared user context (`lib/hooks/useUser.tsx`):** `UserProvider` + `useUser()` hook fetches `GET /users/me` once per page load via `apiFetch`, shared across all consumers to avoid duplicate fetches and to avoid components calling `authClient.getSession()` directly (a known source of SDK cache collisions).
- **Rich text:** TipTap editor; content persisted as `JSONContent`, never raw HTML.
- **Animation:** GSAP restricted to Navbar and loading/preloader animations only; no other animation libraries permitted anywhere else in the app.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`), brand tokens defined in `globals.css` via an `@theme` block (not `tailwind.config.ts`).

### 4.2 Backend (`apps/api`)

- **Entry:** `index.ts` → `app.ts`, which exports an `appReady` promise used for lazy route mounting. The global error handler is registered **inside** `appReady`, after all routes — registering it earlier causes `AppError` to render as HTML instead of the JSON envelope.
- **Middleware:**
  - `auth.middleware.ts` — JWT verification (see Section 5).
  - `rbac.middleware.ts` — `requireRole(...roles: UserRole[])` factory; reads `req.user.role` and returns 403 if not permitted.
- **Controller → Service → Repository per domain**, e.g. `userController.ts` → `userService.ts` → `userRepository.ts`.
- **DB access (`db/index.ts`):** Neon connection pool with a `NODE_ENV=test` guard that skips requiring `DATABASE_URL` under test, so unit/integration tests never hit a real database.

### 4.3 Database (Neon PostgreSQL)

- Auth-owned table: `neon_auth.user` (singular) — `id, name, email, emailVerified, image, createdAt, updatedAt, role, banned, banReason, banExpires`. Managed by Neon Auth; the app reads from it but does not own its schema.
- Application tables (to be designed in MVP 2+): articles, tags, comments, likes, tech_talks, notifications, quizzes, quiz_attempts. **Not yet created** — pending TRD data model work.
- No separate `profile` table currently exists; `contactDetails` is not yet a column and is silently ignored on profile updates until added.
- Role values are stored lowercase in the DB and must be normalized via the shared `capitalizeRole()` helper before ever being attached to `req.user` or returned in an API response — this must never be reimplemented ad hoc.

### 4.4 Third-Party Integrations

| Integration                         | Purpose                            | Owner domain  |
| ----------------------------------- | ---------------------------------- | ------------- |
| Neon Auth (Better Auth, Google SSO) | Authentication, JWT issuance, JWKS | Lahiru (Auth) |
| Neon PostgreSQL                     | Primary data store                 | Shared        |
| Gemini API                          | AI quiz generation                 | Lahiru (Quiz) |
| Vercel                              | Hosting for both apps              | Shared        |
| GitHub Actions                      | CI/CD                              | Shared        |
| SonarQube                           | Code quality gate                  | Shared        |

---

## 5. Authentication & Authorization Architecture (Confirmed Working End-to-End)

This is the most architecturally significant — and most debugged — part of the system. It has gone through a documented pivot and must not be re-derived from first principles by a future contributor without reading this section.

### 5.1 Chosen design

Stateless JWT verification, verified **locally** in the API via JWKS — no per-request network call from Express to Neon Auth.

1. **Frontend** calls `authClient.token()` (from `@neondatabase/auth/next`) to obtain a real, signed JWT (3-part, EdDSA-signed). This is _not_ the same as the opaque session cookie token (`session.session.token`), which is not independently verifiable and must never be used as the Bearer token.
2. Frontend sends the JWT as `Authorization: Bearer <token>` via `apiFetch()`.
3. **Backend** verifies the JWT signature locally using `jose`:
   ```ts
   const JWKS = createRemoteJWKSet(
     new URL(`${NEON_AUTH_BASE_URL}/.well-known/jwks.json`)
   );
   const { payload } = await jwtVerify(token, JWKS, {
     issuer: new URL(NEON_AUTH_BASE_URL).origin, // origin only, no path
     audience: new URL(NEON_AUTH_BASE_URL).origin, // origin only, no path
   });
   ```
4. `payload.sub` is the user ID. The backend then calls `userRepository.findById(payload.sub)` to fetch `email`, `role`, `banned` from the database — **JWT claims are never trusted for role/ban state**, since they reflect Neon's own Data-API roles (e.g. `"authenticated"`), not the app's User/Reviewer/Admin roles.
5. `role` is normalized via `capitalizeRole()` before being attached to `req.user`.
6. `findById()` returning `null` → 401. `banned === true` → 403.
7. `req.user = { userId, email, role }` is attached for downstream Controllers/Services and for `rbac.middleware.ts`.

### 5.2 Why this design was chosen (architectural rationale)

An earlier design attempted session **introspection** (Express calling Neon Auth's `get-session` endpoint per request). This was abandoned because the session token returned to the frontend is opaque and not a verifiable JWT — it cannot be validated without a live round-trip to the auth provider on every request, which is both a performance and an architectural liability for a separate backend service. Neon's documented pattern for exactly this topology (frontend + independent backend) is JWT + local JWKS verification, which is what is implemented now.

### 5.3 Critical, previously-broken details (do not regress)

- **Issuer/audience must be origin-only.** `NEON_AUTH_BASE_URL` includes a project path (`/neondb/auth`); a real token's `iss` claim does not. The JWKS _fetch URL_ uses the full base URL + path; the _issuer/audience check_ uses `new URL(NEON_AUTH_BASE_URL).origin` only. These are two different derived values from the same env var.
- **`authClient.getJWTToken()` does not exist** on `@neondatabase/auth/next` and silently 404s via an auto-generated broken route. The correct method is `authClient.token()`.
- **60-second SDK session cache**: calling `.token()` shortly after any `.getSession()` call elsewhere in the app can return stale session-shaped data. Mitigated by (a) JWT-shape validation + retry-with-backoff in `getValidToken()`, and (b) eliminating direct `.getSession()` calls from feature components in favor of the shared `useUser()` hook.
- **Role capitalization must be centralized** (`capitalizeRole()` in `userTypes.ts`), used identically in `auth.middleware.ts` and any service that returns role in a response body, to prevent the two call sites drifting out of sync (this happened once — see TRD test/bug history).

### 5.4 Role-Based Access Control

- Three roles: `User`, `Reviewer`, `Admin` (title-cased in all outward-facing contexts).
- Enforced via `requireRole(...roles)` middleware composed onto routes, e.g. `router.post('/tech-talks', authenticate, requireRole('Admin'), ...)`.
- RBAC middleware itself has been stable and unmodified throughout the auth migration.

### 5.5 Governance note

The JWT+JWKS pivot is new design work in the Auth domain (owned by Lahiru), not merely a bugfix, even though it is confirmed working end-to-end via live browser smoke testing. It must be walked through with Lahiru and formally accepted before being considered fully merged, once he returns from leave.

---

## 6. Data Flow — Article Review Workflow (Architectural View)

```
Author (web) --POST /api/v1/articles--------------------> API
Author (web) --PATCH /api/v1/articles/:id/submit--------> API --update status PENDING--> DB
                                                              --create notification------> DB
Reviewer (web) --GET /api/v1/articles?status=PENDING-----> API --query DB----------------> DB
Reviewer (web) --PATCH /api/v1/articles/:id/approve------> API --update status PUBLISHED-> DB
                                                              --create notification------> DB
All users (web) --GET /api/v1/articles?status=PUBLISHED--> API --query DB----------------> DB
```

Status transitions are enforced in the Service layer only (never in the Controller or Repository), per the layered architecture rule.

---

## 7. Security Architecture

- Authentication delegated entirely to Google SSO via Neon Auth — no locally stored passwords.
- All API traffic over HTTPS/TLS (enforced by Vercel).
- JWTs are short-lived and verified per-request via JWKS; no session state held in the API.
- Role/ban authority lives in the database, never trusted from the token alone.
- Uploaded files (article images, tech talk slides) must be validated for type and size before storage.
- Input sanitization required on all write endpoints (SQL injection / XSS defense) — parameterized queries only in Repositories.
- Secrets (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, Gemini API key) live in environment variables / Vercel secrets, never in source.

---

## 8. Scalability & Deployment Architecture

- **Backend:** deployed as Vercel serverless functions; Neon's connection pooling is required to handle concurrent short-lived function invocations efficiently.
- **Frontend:** deployed as a separate Vercel project; static/media assets served via CDN.
- **Database:** Neon PostgreSQL (serverless Postgres), SSL required.
- **CI/CD:** GitHub Actions run lint → test → build per app, scoped by path filters (`apps/api/**`, `apps/web/**`), so unrelated changes don't trigger unnecessary pipelines.

---

## 9. Testing Architecture

- Unit and integration tests run against fully mocked repositories and external SDKs (including `jose`'s JWKS calls) — CI never needs real network access to Neon's JWKS endpoint or a live database.
- Integration tests mock `db/index.js` before importing `app`, and simulate authenticated users via `X-Test-User-*` headers rather than real tokens, using `appReady` to know when routes are mounted.
- **Auth-specific rule:** Jest passing is necessary but not sufficient for any change to `auth.middleware.ts`, `lib/api/client.ts`, or `lib/auth/*`. A live browser smoke test against running dev servers, with real Network tab / console evidence, is required before such a change is considered architecturally complete. This rule exists because this exact file has previously "passed tests" while being broken end-to-end (wrong issuer value, wrong SDK method, timing/caching bugs) — see TRD Appendix for full bug history.

---

## 10. Domain Ownership Boundaries (Architectural Governance)

| Domain                                                                   | Owner      | Includes                                                             |
| ------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------- |
| Articles, Admin Dashboard, Homepage shell, global layout                 | Malindu    | Article CRUD, review UI consumption, layout shell, shared components |
| Auth, Comments/Likes, Quiz generation                                    | Lahiru     | Neon Auth/RBAC design, Gemini integration                            |
| User account backend, Review workflow backend, Notifications, Tech Talks | Chathurika | Admin user ops, approve/reject backend, notification dispatch        |

Cross-domain changes (e.g. shared infra files like `app.ts`) require explicit callout in the PR description and are never self-merged. Current exception: Malindu has approval to implement Lahiru's A-01→A-05 (Auth) and Chathurika's UP-01/UP-02 (profile endpoints) tasks.

---

## 11. Known Architectural Debt / Open Risks

- Application-owned data model (articles, comments, likes, tech talks, notifications, quizzes) is not yet designed or migrated — this is the primary architectural work remaining before MVP 2.
- Auth architecture pivot is functionally complete but architecturally un-reviewed by its domain owner (Lahiru).
- Minor: a GSAP target-not-found warning in `Sidebar.tsx` — cosmetic, no architectural impact, not yet triaged.
