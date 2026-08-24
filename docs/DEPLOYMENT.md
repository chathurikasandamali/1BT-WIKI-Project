# Deployment Guideline (DG)

## 1BT Knowledge Management System (1BT-WIKI)

**Version:** 1.0
**Date:** August 2026
**Status:** Platform-independent deployment reference — supersedes "just use Vercel" as the only known path.

---

## 1. Purpose

This document defines how 1BT-WIKI is deployed **independent of any specific hosting platform**. It covers every component that must be hosted, the capacity each needs, and two concrete deployment strategies:

- **Cloud strategy** — managed services (current default: Vercel + Neon + Backblaze B2 + Pusher), or any equivalent container-hosting cloud.
- **On-prem / self-hosted strategy** — a production deployment on infrastructure the organization owns (own server, VPS, or data center), with self-hostable substitutes for every managed dependency.

It does not replace the TRD (day-to-day coding standards) or the ARD (system architecture rationale) — it assumes both and focuses purely on *where things run and how big they need to be*.

**Baseline planning assumption:** ~100 internal employees as users, with explicit guidance on how each number changes as usage grows (Section 9). Adjust the assumptions in Section 8.1 if actual usage differs.

---

## 2. Deployment Philosophy

1. **Twelve-factor config.** All environment-specific values come from environment variables (already true — see Section 6). Nothing platform-specific is hardcoded in application code.
2. **Stateless compute.** `apps/web` and `apps/api` hold no local state between requests (no local file writes, no in-memory sessions) — either can run as a serverless function, a container, or a plain Node process behind a process manager, interchangeably.
3. **Containerize as the portable unit.** A `Dockerfile` per app is the lowest common denominator that runs unmodified on Vercel-adjacent PaaS, any container cloud, Kubernetes, or a single on-prem VM via Docker Compose. This guideline assumes container images as the deployable artifact even where a target platform (like Vercel) doesn't strictly require one.
4. **Managed-service swaps are declared, not hidden.** Every third-party dependency (Neon, B2, Pusher, Neon Auth, Gemini) has a documented self-hosted substitute so the system can run fully offline/on-prem when required. Section 5 and Section 8 call out where a swap is a config change vs. a real architecture change.

---

## 3. Components To Be Hosted

| # | Component | What it is | Statefulness | Current implementation |
|---|-----------|-----------|---------------|--------------------------|
| 1 | **Web app** (`apps/web`) | Next.js 16 App Router frontend (SSR + client) | Stateless | Deployed as a Vercel project today |
| 2 | **API app** (`apps/api`) | Express.js REST API, layered Controller → Service → Repository | Stateless (in-memory JWT cache only, per-request) | Deployed as Vercel serverless functions today |
| 3 | **Relational database** | Primary data store: users (auth-synced), articles, comments, likes, tech talks, notifications, quizzes, app settings | Stateful, durable | Neon PostgreSQL (serverless Postgres) |
| 4 | **Identity provider** | Authentication (Google SSO), JWT issuance, JWKS endpoint | Stateful (owns its own user table) | Neon Auth (Better Auth-based) |
| 5 | **Object storage** | Article images, tech talk slide decks | Stateful, durable, grows over time | Backblaze B2 (S3-compatible API), via `multer` (memory buffer) → `b2Client.ts` |
| 6 | **Real-time channel** | Live notification delivery to the browser | Stateless relay, no durable data | Pusher (hosted pub/sub over WebSockets) |
| 7 | **AI provider** | Quiz-generation LLM calls | External/stateless | Gemini API by default; a second, already-implemented **local/self-hosted provider** exists (Ollama-compatible HTTP `/api/chat`) and is switchable per-deployment via admin settings, no code change required |
| 8 | **Reverse proxy / TLS / CDN** | HTTPS termination, routing, static & image caching | Stateless | Implicit in Vercel today; must be provisioned explicitly everywhere else |
| 9 | **CI/CD** | Lint → test → build (and deploy) pipeline | N/A | GitHub Actions (`deploy-api.yaml`, `deploy-web.yaml`) — already platform-agnostic; only the final "deploy" step is Vercel-specific today (Vercel's Git integration auto-builds on push, not a step in these workflows) |
| 10 | **Code quality gate** | Static analysis | N/A | SonarCloud — platform-independent already |
| 11 | **Secrets store** | `DATABASE_URL`, API keys, `ENCRYPTION_KEY`, etc. | Stateful, sensitive | Vercel Environment Variables today |
| 12 | **Monitoring / logs / backups** | Uptime, error tracking, DB backups, object storage backups | Stateful (retained history) | **Not yet present** — required for any real on-prem production deployment (Section 8.5) |

---

## 4. Environment Variable / Secrets Reference

Names only — values are secrets and must never be committed or shared outside a secrets manager. Source: `apps/api/.env`, `apps/web/.env`, root `.env`.

| Variable | Consumed by | Purpose | Required in prod? |
|---|---|---|---|
| `DATABASE_URL` | `apps/api`, `packages/db` (Prisma) | Prisma connection string (currently via `@prisma/adapter-neon`) | Yes |
| `VERCEL_DATABASE_URL` | `apps/api` (`db/index.ts`, raw `pg.Pool`) | Legacy raw-SQL connection used by the standalone migration runner. **Name is a platform-independence smell** — it's not actually Vercel-specific, just named after where it was first wired up. Recommend renaming to e.g. `RAW_DATABASE_URL` in a follow-up (see Section 10) | Yes |
| `NEON_AUTH_BASE_URL` / `VERCEL_NEON_AUTH_BASE_URL` | `apps/api`, `apps/web` | Neon Auth project base URL, used to derive both the JWKS fetch URL and the JWT issuer/audience (origin only) | Yes |
| `VERCEL_NEON_AUTH_COOKIE_SECRET` | `apps/web` | Neon Auth session cookie signing secret | Yes |
| `VERCEL_NEON_AUTH_COOKIE_DOMAIN` | root/build | Cookie domain scoping | Yes (prod) |
| `BETTER_AUTH_URL` | `apps/web` | Better Auth (underlying Neon Auth SDK) base URL | Yes |
| `B2_ENDPOINT`, `B2_REGION`, `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET_NAME`, `B2_BUCKET_ID` | `apps/api` | Backblaze B2 object storage credentials | Yes (or swap for S3/MinIO equivalents — Section 8.4) |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | `apps/api` | Server-side Pusher credentials | Yes (or Soketi equivalents — Section 8.3) |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | `apps/web` | Client-side Pusher connection (public by design) | Yes |
| `GEMINI_API_KEY` | `apps/api` | Cloud AI quiz generation | Only if `gemini` provider is selected in admin settings |
| `QWEN_API_KEY` | `apps/api` | Alternate hosted LLM credential (admin-configurable quiz provider) | Only if that provider is selected |
| `ENCRYPTION_KEY` | `apps/api` | AES-256-GCM key (32 bytes, base64) used to encrypt LLM API keys stored in `app_settings` | Yes |
| `NEXT_PUBLIC_SERVER_URL` | `apps/web` | Base URL the frontend uses to reach the API | Yes |
| `PORT` | `apps/api` | Listen port when not on a serverless platform | On-prem/container only |
| `NODE_ENV` | both | `development` / `test` / `production` | Yes |
| `SONAR_TOKEN` | CI only | SonarCloud analysis auth | CI only |

**Generating `ENCRYPTION_KEY`:** `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

---

## 5. Deployment Topology

### 5.1 Cloud (managed services) — current & recommended default

```
                         ┌───────────────────────────┐
 Browser ───HTTPS───────▶│  apps/web (Next.js)        │
                         │  containerized or PaaS      │
                         └───────────┬────────────────┘
                                     │ JWT Bearer / apiFetch()
                                     ▼
                         ┌───────────────────────────┐
                         │  apps/api (Express)         │
                         │  containerized or PaaS      │
                         └──┬──────┬─────────┬────────┘
                            │      │         │
                 ┌──────────┘      │         └───────────┐
                 ▼                 ▼                      ▼
        ┌─────────────┐   ┌───────────────┐     ┌──────────────────┐
        │ Neon         │   │ Backblaze B2   │     │ Pusher             │
        │ PostgreSQL   │   │ (images/files) │     │ (real-time)        │
        └─────────────┘   └───────────────┘     └──────────────────┘
                 ▲
                 │ JWKS / user sync
        ┌─────────────┐        ┌──────────────┐
        │ Neon Auth    │        │ Gemini API    │◀── apps/api
        │ (Google SSO) │        └──────────────┘
        └─────────────┘
```

### 5.2 On-prem / self-hosted — fully independent stack

```
                    ┌─────────────────────────────────────────┐
                    │  Reverse proxy (Nginx/Caddy) — TLS term.  │
                    └───────┬───────────────────────┬──────────┘
                            ▼                         ▼
                 ┌────────────────┐        ┌────────────────┐
                 │ apps/web        │        │ apps/api        │
                 │ (Docker)        │        │ (Docker)        │
                 └───────┬────────┘        └───┬───┬───┬─────┘
                         │                      │   │   │
              ┌──────────┘          ┌───────────┘   │   └──────────────┐
              ▼                      ▼                ▼                 ▼
     ┌─────────────────┐   ┌─────────────────┐ ┌─────────────┐ ┌────────────────┐
     │ PostgreSQL        │   │ MinIO (S3 API)   │ │ Soketi       │ │ Ollama            │
     │ (Docker/managed)  │   │ replaces B2      │ │ replaces     │ │ replaces Gemini    │
     │                    │   │                  │ │ Pusher       │ │ (already supported │
     │                    │   │                  │ │              │ │ via local provider)│
     └─────────────────┘   └─────────────────┘ └─────────────┘ └────────────────┘
              ▲
              │ requires a self-hosted identity provider (Keycloak/Authentik/
              │ self-hosted Better Auth) — see Section 8.2 caveat
     ┌─────────────────┐
     │ Self-hosted Auth  │
     └─────────────────┘
```

---

## 6. Capacity Planning

### 6.1 Baseline assumptions (~100 employees)

Internal knowledge-base usage patterns are bursty and read-heavy, not sustained load. Working assumptions (adjust to your org's real numbers if known):

- 100 registered users, ~70% weekly-active.
- Peak concurrency: ~20–30 simultaneous active sessions during business hours (20–30% of the user base — typical for internal tools, not consumer apps).
- Content creation is a minority activity: assume ~30 articles/month org-wide, averaging 3 images per article (cap is 10 at 5 MB each), plus ~5 tech-talk slide decks/month at up to 8 MB.
- Quiz generation: on-demand, low frequency (tens per day), not a sustained load driver.

### 6.2 Compute sizing

| Component | Recommended baseline (100 users) | Notes |
|---|---|---|
| `apps/web` | 1–2 vCPU / 1–2 GB RAM per instance, 2 instances for redundancy | Next.js SSR is the heavier of the two; scale on CPU/response-time, not just request count |
| `apps/api` | 1 vCPU / 1 GB RAM per instance, 2 instances for redundancy | Express is lightweight; most latency is DB/B2/Pusher round-trips, not CPU-bound |
| Load balancer / reverse proxy | 1 shared instance (or platform-managed) | Terminates TLS, routes `/` → web, `/api` → api |

At this scale, two small instances per app behind a load balancer (or the serverless equivalent, auto-scaling 0–3) is comfortably sufficient headroom, not a bare minimum.

### 6.3 Database sizing

| Deployment | Recommendation |
|---|---|
| Cloud (Neon) | Smallest autoscaling compute tier (0.25–1 CU) is sufficient at 100 users; enable autosuspend for cost, autoscale ceiling ~2 CU for headroom |
| On-prem (self-hosted Postgres) | 2 vCPU / 4 GB RAM, 50 GB SSD is generous headroom for years at this scale; enable `pg_stat_statements` for visibility |

Storage: the data model is relational + light `jsonb` (quiz questions, settings) — expect low single-digit GB even after a year at 100-user scale. Object (image) storage is the real growth driver, not the database.

### 6.4 Object storage sizing (images & attachments)

Using the baseline assumptions in 6.1:

```
Articles/month: 30 × avg 3 images × ~1.5 MB avg (well under the 5 MB cap)  ≈ 135 MB/month
Tech talk slides/month: 5 × avg 5 MB                                       ≈  25 MB/month
─────────────────────────────────────────────────────────────────────────────────────────
Estimated growth: ~160 MB/month → ~2 GB/year at steady state
```

Recommendation: provision a bucket with a soft alert at 5 GB and a hard review at 20 GB — well above a 5-year projection at this scale, cheap insurance against a burst of high-resolution uploads. Enforce the existing `MAX_ARTICLE_IMAGE_SIZE_BYTES` (5 MB), `MAX_ARTICLE_IMAGES` (10/article), and `MAX_TECH_TALK_SLIDES_SIZE_BYTES` (8 MB) limits at the API layer — they are already implemented and are the primary cost/capacity control.

### 6.5 Real-time (Pusher/Soketi) sizing

~20–30 peak concurrent WebSocket connections, low message volume (notification events only, not chat). This fits comfortably within Pusher's lowest paid tier or a free tier; a self-hosted Soketi instance has no meaningful capacity ceiling at this scale on a single small container.

### 6.6 AI provider

Gemini API: pay-per-call, no capacity provisioning needed. Local/Ollama: see Section 8.6 for hardware sizing if that path is chosen.

---

## 7. Cloud Deployment Strategy

### 7.1 Option A — Vercel (current, zero extra infrastructure)

Two Vercel projects (`1bt-wiki-web`, `1bt-wiki-api`), Git-integrated auto-deploy on push to `main`/`dev`. Managed services (Neon, B2, Pusher, Gemini) are already platform-agnostic — nothing about them ties the system to Vercel. This remains a valid, low-effort option; it just should not be the *only* documented option, which is the point of this guideline.

### 7.2 Option B — Any container-hosting cloud

1. Build a `Dockerfile` for `apps/web` (Next.js `standalone` output) and `apps/api` (multi-stage build → `node dist/index.js`), building `packages/db`/`packages/shared` first as workspace dependencies.
2. Push images to a container registry (GHCR, ECR, Artifact Registry, etc.) from GitHub Actions.
3. Deploy to any of: AWS ECS/Fargate, Google Cloud Run, Azure Container Apps, Fly.io, Render, Railway, DigitalOcean App Platform. All of these accept the same two images unmodified.
4. Keep Neon Postgres, Neon Auth, Backblaze B2, Pusher, Gemini as-is — none of them require Vercel; only the compute layer moves.
5. Point a managed load balancer / the platform's built-in HTTPS routing at the two services; set `NEXT_PUBLIC_SERVER_URL` on web to the API's public URL.
6. CI/CD: extend `deploy-api.yaml`/`deploy-web.yaml` with a final "build & push image" + "trigger deploy" step (platform-specific CLI/action), replacing Vercel's implicit Git-integration deploy.

This is the "decouple hosting from Vercel, keep the managed services" path — the smallest change that satisfies platform independence for the compute layer.

---

## 8. On-Prem / Self-Hosted Deployment Strategy

This is a **real production deployment** on infrastructure the organization owns — not a developer laptop setup. It is the higher-effort path: every managed dependency needs a self-hosted substitute, documented below with an honest note on how much work each swap actually is.

### 8.1 Reference server sizing (100-employee baseline)

Single-node Docker Compose deployment (sufficient at this scale; see Section 9 for when to split):

| Resource | Recommendation |
|---|---|
| vCPU | 4–8 |
| RAM | 16 GB (32 GB if running the local LLM provider — Section 8.6) |
| Storage | 200 GB SSD (OS + containers + Postgres + MinIO + logs), with room to grow per Section 6.4 |
| OS | Any current Linux LTS (Ubuntu Server 24.04 LTS or similar) |
| Network | Static IP or DNS-mapped hostname, inbound 443 only (behind the reverse proxy) |

### 8.2 Identity provider — the one non-trivial swap

**This is the most important caveat in the whole document.** Neon Auth is coupled to a Neon-hosted Postgres project: it auto-manages the `neon_auth.user` table and issues JWTs verified via *its own* JWKS endpoint (`NEON_AUTH_BASE_URL`). You cannot point Neon Auth at a self-hosted Postgres instance, and self-hosting Postgres without Neon means you lose that auto-synced user table entirely.

Practically, that means:

- **If you self-host Postgres, you must also self-host the identity provider.** These two swaps are linked, not independent.
- Self-hosting options: a self-hosted Better Auth instance (same library Neon Auth is built on), or a general-purpose OIDC provider (Keycloak, Authentik) fronting Google SSO.
- Required code changes: `auth.middleware.ts` already verifies via generic JWKS (`jose` + `createRemoteJWKSet`) — this part is provider-agnostic. What changes is `NEON_AUTH_BASE_URL` (now pointing at your own auth service) and the removal of the Neon-specific `neon_auth.user` auto-sync, replaced with your own `users` table + repository layer.
- **Treat this as an architecture change requiring its own design review**, not a drop-in environment variable swap — flagged explicitly per your request to call out full self-host alternatives honestly rather than hand-waving them.
- If a fully self-hosted identity provider is out of scope for now, a valid middle ground is: self-host compute + object storage + real-time, but keep Neon Postgres + Neon Auth as the two managed exceptions (they're the hardest to replace and the least platform-coupled — Neon works from anywhere, not just Vercel).

### 8.3 Database

Standard PostgreSQL 16+ in a Docker container (or a dedicated VM), with scheduled `pg_dump` backups (Section 8.5). **Required code change:** `packages/db/src/client.ts` currently uses `@prisma/adapter-neon`, which speaks Neon's serverless (HTTP/WebSocket) driver protocol — it will not connect to vanilla Postgres. Swap to the standard Prisma Postgres connection (drop the adapter, use `datasource url` directly, or use `@prisma/adapter-pg`). The raw `pg.Pool` in `apps/api/src/db/index.ts` already uses the standard driver and needs no change beyond pointing `VERCEL_DATABASE_URL`/its renamed successor at the new host and adjusting the hardcoded `ssl: { rejectUnauthorized: false }` (fine for a trusted internal network; use a real CA-signed cert if the DB is reachable beyond it).

### 8.4 Object storage (images & attachments)

**MinIO** is the drop-in self-hosted substitute — it implements the S3 API, and `backblaze-b2`'s SDK usage in `b2Client.ts` is B2-specific (not S3-generic), so the swap is: replace `b2Client.ts` with an S3-compatible client (`@aws-sdk/client-s3`, works against MinIO, B2's S3-compatible endpoint, AWS S3, Cloudflare R2, or GCS with the S3 shim) behind the same `uploadFile`/`deleteFile` interface already exported. Existing validation (`upload.constants.ts` size/type limits) and the `article_attachments` DB schema (stores key/bucket/URL/mime/size) need no changes — they're already storage-provider-agnostic. Run MinIO as a container with a persistent volume; back it up per Section 8.5.

### 8.5 Backups, monitoring, and disaster recovery (required for real production, currently absent)

| Concern | Recommendation |
|---|---|
| Database backups | Nightly `pg_dump` (or continuous WAL archiving for point-in-time recovery) to a separate disk/off-box location; test restores quarterly |
| Object storage backups | MinIO bucket replication or scheduled `mc mirror` to a secondary location |
| Uptime monitoring | A lightweight self-hosted option (e.g. Uptime Kuma) or an external synthetic check hitting `GET /api/v1/health` |
| Log aggregation | Container logs shipped to a local Loki/Grafana stack or equivalent — currently there is no centralized logging anywhere in the stack |
| Error tracking | Add an APM/error tracker (e.g. Sentry, self-hostable) — not currently integrated |
| Alerting | At minimum, disk-space and service-down alerts to the team's chat/email |

None of this exists today because Vercel/Neon/B2 handle it implicitly for the cloud path. On-prem removes those guarantees, so this section is not optional for a production on-prem deployment.

### 8.6 Real-time — Soketi

[Soketi](https://soketi.app) is an open-source server implementing the Pusher protocol. Because `apps/api`'s `pusherClient.ts` and `apps/web`'s `pusher-js` client both speak the standard Pusher protocol/SDK, pointing them at a self-hosted Soketi instance (via `PUSHER_*`/`NEXT_PUBLIC_PUSHER_*` host/port overrides) is close to a configuration-only swap, not a code rewrite.

### 8.7 AI — already supported, zero code change

`apps/api` already has a pluggable quiz-generation provider (`quizProviderFactory.ts`) with a working local provider (`localQuizProvider.ts`) that speaks Ollama's `/api/chat` protocol. Run Ollama in a container, pull a model (e.g. a quantized 7–8B instruct model), and switch the admin-configurable `quiz_llm_config` setting to `local` with the Ollama endpoint — no deployment of new application code required.

Hardware note: CPU-only inference works but is slow (tens of seconds per quiz generation, acceptable given quiz generation is already fire-and-forget/fallback-tolerant per the existing architecture). For sub-10-second responses, a GPU with ≥8 GB VRAM is recommended; otherwise budget 16 GB+ RAM headroom for CPU inference and accept higher latency — the existing fallback-quiz mechanism already tolerates slow/failed generation gracefully.

---

## 9. Scaling Path

Capacity numbers above are a starting point, not a ceiling. How each component changes as the user base grows:

| Stage | Users | Compute | Database | Object storage | Real-time | Notes |
|---|---|---|---|---|---|---|
| **Pilot** (this baseline) | ~100 | 2 small instances/app | Smallest Neon tier / 2 vCPU self-hosted | Single bucket, no CDN | Pusher free/starter or single Soketi container | Single-region, single-node on-prem is fine |
| **Growth** | 500–1,000 | Autoscale 3–6 instances/app; add a dedicated LB health-check | Neon Scale tier + read replica, or self-hosted Postgres with a read replica; connection pooling (PgBouncer/Neon pooler) becomes necessary | Add a CDN in front of the bucket for image delivery; lifecycle rules for old/unused attachments | Pusher paid tier, or Soketi + Redis adapter for horizontal scaling | Split web/api onto separate scaling groups if load differs |
| **Scale** | 1,000+ / public-facing | Multi-instance autoscaling (Kubernetes/ECS/Cloud Run), multi-AZ | Multi-AZ Postgres, dedicated read replicas, connection pooler mandatory | Multi-region object storage + edge CDN (e.g. Cloudflare R2 + CDN) | Pusher Business tier or a clustered Soketi deployment | Add WAF/rate limiting; centralized log aggregation and APM become mandatory, not optional; consider a hybrid AI strategy (local for baseline load, cloud Gemini burst overflow) |

The trigger to move a stage is **sustained** peak-hour saturation (CPU/connection-pool/queue metrics), not raw headcount — a 400-person org with light usage may never need "Growth"-tier infrastructure, and a 100-person org with heavy daily authoring might.

---

## 10. Recommended Follow-Up Cleanup (Platform-Independence Hygiene)

Not required to deploy, but worth doing to make the "independent of platform" story fully honest in the codebase, not just in this document:

- Rename `VERCEL_DATABASE_URL` → a platform-neutral name (e.g. `RAW_DATABASE_URL`) across `apps/api/src/db/index.ts`, CI workflows, and `.env` files — it's not Vercel-specific infrastructure, just legacy naming from the original setup.
- Similarly rename `VERCEL_NEON_AUTH_BASE_URL` / `VERCEL_NEON_AUTH_COOKIE_SECRET` / `VERCEL_NEON_AUTH_COOKIE_DOMAIN` (they configure Neon Auth, not Vercel).
- Add the health/monitoring/backup pieces from Section 8.5 regardless of which deployment path is chosen — they're currently missing even in the cloud/Vercel path.
- Add explicit "deploy" steps to `deploy-api.yaml`/`deploy-web.yaml` (or new workflows) once a non-Vercel target is chosen, so CI/CD stays platform-agnostic end-to-end rather than relying on Vercel's implicit Git integration.

---

## 11. Summary Checklist

Before calling any deployment (cloud or on-prem) production-ready:

- [ ] All Section 4 environment variables set via a proper secrets mechanism (not committed `.env` files)
- [ ] `ENCRYPTION_KEY` generated fresh per environment (never reused between dev/staging/prod)
- [ ] Database migrations applied via `prisma migrate deploy` (never `db:push` for anything with seed data — see README caveat)
- [ ] TLS/HTTPS enforced end-to-end
- [ ] Upload size/type limits confirmed enforced (`upload.constants.ts`)
- [ ] Backups configured and a restore has been tested at least once (Section 8.5)
- [ ] Health check endpoint (`/api/v1/health`) wired into uptime monitoring
- [ ] CI (`deploy-api.yaml`/`deploy-web.yaml`) green on the branch being deployed
- [ ] If self-hosting: identity-provider swap (Section 8.2) has had its own review — it is an architecture change, not a config change
