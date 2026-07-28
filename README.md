# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Authentication and authorization

Authentication and authorization should be handled in separate layers of the application.

- Use the server-side auth helper from `apps/web/src/lib/auth/server.ts` for session creation, validation, and protecting server routes, API handlers, and server actions. This is the place where Neon Auth should verify the user identity and attach the authenticated context to the request.
- Use the client-side auth helper from `apps/web/src/lib/auth/client.ts` for browser-facing sign-in, sign-out, and UI state. Client components should react to the authenticated state, but they should not be the source of truth for permissions.
- While middleware can protect all internal routes, role-based access control should still be handled inside individual components and domain logic. Middleware is a coarse gate; components should enforce the specific UI and action permissions that apply to that feature.
- Authorization should live in the relevant domain/service layer. After authentication resolves the user, each domain should decide whether that user is allowed to read, write, or perform a specific action based on roles, scopes, or business rules.
- The user's data can be accessed from the active session details. For example, you can check the session in a client component with `const { data, error } = await client.auth.getSession()` and then use `data.session.user.email` when a session exists.
- Keep auth concerns at the edge and keep authorization close to the feature or domain that owns the data. This makes the flow easier to reason about and keeps permissions aligned with the business logic.
- For more details, refer to the Neon Auth documentation for the JavaScript SDK: https://neon.com/docs/reference/javascript-sdk#auth-signinwithoauth and the broader authentication flow guide: https://neon.com/docs/auth/authentication-flow.

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
pnpm dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
pnpm exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
pnpm exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
pnpm exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
pnpm exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
pnpm exec turbo link
pnpm exec turbo link
```

## AI Quiz Generation (QZ-01)

Generates a quiz from a **Published** article using a 2-agent LLM workflow (generator → validator) hosted in **Microsoft AI Foundry**. Owned by `ai-integration-engineer`.

### Endpoint

```
POST /api/v1/articles/:id/quiz/generate      (requires authentication)
```

- Generates **10 questions** per quiz (fixed default until admin `quiz_config` exists).
- Question types: `mcq`, `single_choice` (exactly one correct answer) and `multiple_choice` (two or more correct answers).
- **Correct answers are never sent to the client.** Questions are persisted with their answers in the database; the response contains only `id`, `question`, `type`, and `options` per question. Server-side scoring is a later task.

**Success response — `201 Created`:**

```json
{
  "success": true,
  "message": "Quiz generated successfully",
  "data": {
    "quizId": "…",
    "articleId": "…",
    "isFallback": false,
    "questions": [
      { "id": "…", "question": "…", "type": "mcq", "options": ["A", "B", "C", "D"] }
    ]
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Invalid article id / article is not `Published` |
| 404 | Article not found (or soft-deleted) |
| 422 | Article body has no extractable text |
| 502 | Workflow unreachable or returned output violating the quiz contract (and no fallback exists) |
| 503 | `FOUNDRY_WORKFLOW_URL` / `FOUNDRY_API_KEY` not configured |
| 504 | Workflow request timed out |

### Request flow

```
quizRoutes → quizController → quizService → foundryClient (MS Foundry workflow)
                                  │               │
                        articleRepository   quizPrompts (versioned)
                                  │
                            quizRepository → quizzes / quiz_questions (Neon PostgreSQL)
```

1. `quizService.generateQuiz` loads the article and rejects anything not `Published`.
2. The TipTap `body` is flattened to plain text (`v1/utils/tiptapText.ts`).
3. `foundryClient` POSTs `{ promptVersion, questionCount, articleTitle, generatorPrompt, validatorPrompt }` to the Foundry workflow endpoint.
4. The raw output is validated by `parseGeneratedQuestions` (`v1/types/quiz.types.ts`) — it accepts a JSON array, `{ "questions": [...] }`, or a fenced JSON string, and rejects anything violating the contract (wrong count, bad types, out-of-range answer indexes).
5. The quiz is stored atomically (quiz + questions) with a `config_snapshot` recording the prompt version, then returned with answers stripped.

### Fallback quizzes

When a reviewer **approves** an article (`reviewerService.approveArticle`), a fallback quiz is pre-generated fire-and-forget and stored with `is_fallback = true`. If the live Foundry workflow later fails with any 5xx error, `generateQuiz` serves the newest stored fallback (`"isFallback": true` in the response) instead of erroring; only when no fallback exists does the client see the 5xx. Domain errors (not Published, empty body) never fall back.

### Key files (apps/api/src)

| File | Purpose |
|------|---------|
| `v1/routes/quizRoutes.ts` | Route, mounted at `/:id/quiz` inside `articlesRoutes.ts` |
| `v1/controllers/quizController.ts` | UUID validation, 201 response shaping |
| `v1/services/quizService.ts` | Orchestration: guards, generation, fallback logic |
| `v1/repositories/quizRepository.ts` | Prisma nested create + latest-fallback lookup |
| `v1/lib/foundryClient.ts` | HTTP client for the Foundry workflow (timeout, error mapping) |
| `v1/lib/prompts/quizPrompts.ts` | Versioned generator/validator prompts (`PROMPT_VERSION`) |
| `v1/utils/tiptapText.ts` | TipTap JSON → plain text (stand-in until content-authoring ships a shared one) |
| `v1/types/quiz.types.ts` | Domain types + LLM output validator + answer stripping |
| `db/migrations/20260728120000_create_quizzes.sql` | `quiz_question_type` enum, `quizzes`, `quiz_questions` tables |

The Prisma models (`quiz`, `quizQuestion`, `QuizQuestionType`) live in `packages/db/prisma/schema.prisma`; run `pnpm --filter @repo/db build` after schema changes to regenerate the client.

### Database

- `quizzes`: `id`, `article_id` (FK → articles, cascade), `is_fallback`, `config_snapshot` (jsonb), `generated_at`
- `quiz_questions`: `id`, `quiz_id` (FK → quizzes, cascade), `question`, `question_type` (enum), `options` (jsonb array of strings), `correct_answer` (jsonb array of indexes — supports multi-answer), `explanation`

Apply the migration to the Neon dev branch via `apps/api/src/db/migrations/run_migration.ts` (or `pnpm --filter @repo/db db:push`).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FOUNDRY_WORKFLOW_URL` | Yes | MS Foundry quiz workflow invocation endpoint |
| `FOUNDRY_API_KEY` | Yes | Bearer key for the workflow endpoint |
| `FOUNDRY_TIMEOUT_MS` | No | Request timeout, default `60000` |

### Tests

```sh
pnpm --filter api test -- --testPathPatterns "quiz"
```

- `v1/services/__tests__/quizService.test.ts` — guards, happy path, answer stripping, fallback on workflow failure/invalid output, fallback pre-generation.
- `v1/controllers/__tests__/quizController.test.ts` — id validation, 201 shaping, error forwarding.

## Code Quality (SonarQube / SonarCloud)

Static analysis runs against SonarCloud (org `1bt-wiki`, project `1bt-project-wiki`), configured in [sonar-project.properties](sonar-project.properties).

### Running an analysis locally

1. Get a SonarCloud token (Account > Security > Generate Token) and add it to `.env` at the repo root:
   ```
   SONAR_TOKEN=your-token-here
   ```
2. Run the scan:
   ```sh
   pnpm sonar
   ```
   This loads `.env` via `dotenv-cli` and runs `npx @sonar/scan`. Results are published to the [SonarCloud dashboard](https://sonarcloud.io/dashboard?id=1bt-project-wiki).

`pnpm check` runs lint, tests, and the sonar scan together (see `turbo.json`).

### Editor feedback (SonarLint)

The SonarLint VS Code extension is configured in connected mode (`.vscode/settings.json`, `.sonarlint/connectedMode.json`) against the same SonarCloud project, so issues surface inline as you edit without needing a full scan.

### Next steps

- **Wire up coverage**: `apps/api`'s Jest config doesn't currently emit an lcov report, so SonarCloud sees 0% coverage. Add `collectCoverage: true` and `coverageReporters: ["lcov"]` to the `jest` block in `apps/api/package.json`, then re-add `sonar.javascript.lcov.reportPaths=apps/api/coverage/lcov.info` to `sonar-project.properties`.
- **Add a quality gate check to CI** so PRs fail on new issues instead of relying on local runs.
- If you add new apps/packages under `apps/*` or `packages/*`, extend `sonar.sources` (and `sonar.tests`, if applicable) in `sonar-project.properties` to include them — they aren't picked up automatically.

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
