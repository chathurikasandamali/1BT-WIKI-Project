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
