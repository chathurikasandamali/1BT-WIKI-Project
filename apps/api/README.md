# API (Express + TypeScript)

Minimal Express + TypeScript scaffold with a simple MVC and repository pattern example.

Scripts:

- `pnpm --filter ./apps/api dev` — start dev server with hot reload (requires `ts-node-dev`).
- `pnpm --filter ./apps/api build` — compile TypeScript to `dist/`.
- `pnpm --filter ./apps/api start` — run compiled server.

Endpoints:

- `GET /api/users` — list users
- `POST /api/users` — create user { name, email }

## Quiz generation — LLM provider abstraction

Quiz generation is decoupled from any single LLM vendor via a small adapter pattern in `src/v1/lib/llm/`:

- `quizProvider.types.ts` — `QuizLlmAdapter` (implemented once per vendor) and `QuizGenerationProvider` (what `quizService.ts` depends on).
- `providers/geminiQuizProvider.ts` — the Gemini adapter (today's only implementation).
- `quizProviderFactory.ts` — resolves the active adapter per call from the admin `quiz.quiz_llm_config` setting (`provider`, `model`, `apiKey`).

Provider/model/API key are managed via the admin settings API (`/api/v1/admin/settings/quiz/quiz_llm_config`) instead of env vars/code constants, so they can be changed without a redeploy. `apiKey` bootstraps from `GEMINI_API_KEY` and is masked in all settings API responses.

To add a new provider: create an adapter implementing `QuizLlmAdapter`, register it in `quizProviderFactory.ts`'s `PROVIDERS` map, and add its name to `QuizLlmProviderName` / `quizLlmConfigSchema` in `src/v1/types/settings.types.ts` — `quizService.ts` never needs to change.
