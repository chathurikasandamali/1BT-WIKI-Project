# 1BT WIKI — Global Project Rules

## Project Identity
- Project: **1BT WIKI** (Internal Knowledge Base Platform)
- Team is organized by **engineering role**, not by individual. A contributor may hold more than one role, and a role may be held by more than one contributor. Rules and boundaries in this repo are always addressed to the role.
- Roles: `authentication-engineer` · `authorization-engineer` · `user-account-engineer` · `content-authoring-engineer` · `content-moderation-engineer` · `content-publishing-engineer` · `engagement-engineer` · `notification-engineer` · `ai-integration-engineer` · `analytics-dashboard-engineer`
- Sprint: 2 Weeks · 4 MVP Releases · July 2026

## Tech Stack (never deviate)
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Auth UI | **Neon Auth** |
| Rich Text | TipTap editor |
| Backend | Node.js + Express + TypeScript |
| Database | Neon PostgreSQL |
| Auth User Sync | `neon_auth.user` table (auto-managed by Neon Auth) |
| Deployment | Vercel |
| Testing | Cypress (E2E) + Jest (unit/integration) |
| Code Quality | SonarQube |
| AI | GEMINI API |

## TypeScript Standards
- Always use `strict: true` — zero tolerance for TypeScript errors
- **Never use `any`** — use `unknown` and narrow, or define proper interfaces
- All function parameters and return types must be explicitly typed
- Use `interface` for object shapes, `type` for unions/intersections/aliases
- Export types from a dedicated `types/` file per domain

```typescript
// ✅ Correct
interface ArticleResponse {
  id: string;
  title: string;
  status: ArticleStatus;
  authorId: string;
  createdAt: Date;
}

// ❌ Wrong — never do this
const getArticle = (id: any): any => { ... }
```

## File & Folder Naming
| Artifact | Convention | Example |
|----------|------------|---------|
| Files | `camelCase` | `articleService.ts` |
| React components | `PascalCase.tsx` | `ArticleCard.tsx` |
| Hooks | `use[Name].ts` | `useArticleList.ts` |
| Test files | `[file].test.ts` | `articleService.test.ts` |
| Cypress tests | `[feature].cy.ts` | `article-lifecycle.cy.ts` |
| DB migrations | `[timestamp]_[desc].sql` | `20260601_create_articles.sql` |

## Import Path Standards
- Avoid long relative imports such as `../../` or `../../../`.
- Prefer alias-based imports configured in project path mappings or package-level aliases instead of deep folder traversal.
- Use clear aliases such as `@/`, `@app/`, `@shared/`, or workspace package imports for cross-package code.
- Example:
  - ✅ `import { ArticleCard } from '@/components/articles/ArticleCard'`
  - ❌ `import { ArticleCard } from '../../../../components/articles/ArticleCard'`

## Async / Error Handling
- Always use `async/await` — never callbacks or raw `.then()` chains
- All async functions must be wrapped in try/catch or use centralized error middleware
- Never swallow errors silently — always log or rethrow

```typescript
// ✅ Correct
async function fetchArticle(id: string): Promise<Article> {
  try {
    return await articleRepository.findById(id);
  } catch (error) {
    logger.error('Failed to fetch article', { id, error });
    throw new AppError('Article not found', 404);
  }
}
```

## Environment Variables
- All secrets and config must come from `process.env`
- Never hardcode URLs, API keys, database strings, or domain names
- Use a `src/config/env.ts` file to validate and export all env vars with Zod

## Code Comments
- Comment **why**, not **what** — the code shows what; the comment explains intent
- Use JSDoc for all exported functions, classes, and interfaces
- Remove dead code — do not comment out code; use Git instead

## Branch Protection (do not generate code that bypasses these)
- `main` → production (Vercel auto-deploys; requires PR + SonarQube pass)
- `dev` → integration (all features merge here first)
- `MVP[1-4]` → mvp brnaches (PR are merged in to active mvp's branch)
- `feature/[role]-[task-id]-[slug]` → role-scoped work
  - e.g. `feature/authentication-engineer-A-01-google-oauth`
  - e.g. `feature/content-moderation-engineer-RV-01-review-queue`
  - e.g. `feature/content-authoring-engineer-KB-01-article-crud`

## Commit Message Format
```
[TASK-ID]-[OWNER]-[ROLE] type(scope): short description

Examples:
[A-01]-[LN]-[AUTH] feat(auth): add Google OAuth domain restriction
[KB-03]-[CS]-[CONTENT] fix(articles): prevent draft edit after submission
[RV-02]-[MG]-[MOD] feat(review): send approval notification to author
```
Role tags: `AUTH` (authentication) · `AUTHZ` (authorization) · `ACCT` (user-account) · `CONTENT` (content-authoring) · `MOD` (content-moderation) · `PUB` (content-publishing) · `ENGAGE` (engagement) · `NOTIF` (notification) · `AI` (ai-integration) · `DASH` (analytics-dashboard)

Types: `feat` | `fix` | `refactor` | `test` | `docs` | `chore`

## Conflict Prevention — Role Boundaries
Each role owns its domain. **Never create or modify files outside your role's domain without a PR discussion with whoever is currently holding that role.**

| Domain | Role | Paths |
|--------|------|-------|
| Google OAuth · Sessions · Login | `authentication-engineer` | `**/auth/**` (excl. RBAC), `src/lib/neon-auth*`, `src/middleware/auth.middleware.ts` |
| RBAC · Role guards | `authorization-engineer` | `src/middleware/rbac.middleware.ts`, `**/guards/**` |
| User admin ops · Self-service profile | `user-account-engineer` | `**/users/**`, `**/profile/**`, `**/admin/users/**` |
| Article CRUD · Rich-text editor | `content-authoring-engineer` | `**/articles/**` (excl. review-only routes) |
| Review / approve / reject workflow | `content-moderation-engineer` | `**/reviewer/**` |
| Tech Talk management | `content-publishing-engineer` | `**/techTalks/**` |
| Comments · Likes | `engagement-engineer` | `**/comments/**`, `**/likes/**` |
| Notification system | `notification-engineer` | `**/notifications/**` |
| AI Quiz Generator | `ai-integration-engineer` | `**/quiz/**` |
| Admin dashboard stats · Homepage feed | `analytics-dashboard-engineer` | `**/admin/dashboard/**`, `**/homepage/**`, `src/app/page.tsx` |
| Shared / Infrastructure | **All roles (via PR)** | `src/config/**`, `src/middleware/**`, `src/types/**`, `src/db/**`, `src/components/ui/**` |
