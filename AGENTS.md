# Agent notes

## Scope

This repository is a development foundation for an estimates-and-deposits SaaS for solo tradespeople and tiny crews.

One-line product: send estimates that customers actually accept and pay.

Do not implement product features unless the current task asks for them.

Do not add URL shortening, link redirects, click analytics, campaigns, escrow, marketplaces, dispute resolution, or dashboards unless explicitly requested.

v1 money model: customer pays a **deposit** on a public estimate page; funds go to the tradesperson via Stripe Connect. Prefer a **subscription** (free tier then ~$12–15/mo) over taking a cut of deposits. Do not build full-job escrow.

Authentication is Better Auth email OTP on `/api/v1/auth`. Do not add passwords, OAuth, or extra auth providers unless asked.

## Comments

Never add JSDoc. Never add comments that narrate what the next lines do. Names, types, and signatures are the docs.

The only legal comment is a short `//` that explains a non-obvious **why**: a platform limit, a security constraint, a workaround, or a surprising default. If a competent reader would not ask "why is this here?", delete the comment. Prefer renaming over documenting.

## Tooling

- Package manager: Bun. Prefer `bun` commands. Do not introduce npm/pnpm/yarn unless a tool requires it.
- App: TanStack Router (file-based) + Hono on Cloudflare Workers.
- UI: shadcn/ui in `src/frontend`.
- Database: Drizzle + Cloudflare D1 in `src/backend/db`.
- Email: Cloudflare Email binding `EMAIL`. In `ENVIRONMENT=development`, OTPs are logged to the console and mail is not sent.

`bun run check-types` is the typecheck to run.

HTTP API routes live under `/api/v1`. `run_worker_first` is true so the Worker handles API and auth before static assets. Create Better Auth with `createAuth(env)` per request — do not use a module-level singleton.

## Backend

Hono on the Worker is native — no HTTP adapter. Keep these trees:

- `/api/v1/auth/*` — Better Auth `handler`, mounted on the Worker entry, not on the typed API
- `/api/v1/*` — chained Hono app exported as `AppType` / `V1Api` for `hc`
- SPA fallback — `ASSETS.fetch` from Worker `notFound` for non-API paths

Each resource lives in `backend/routes/v1/<resource>/` and exports a chained `new Hono<AppEnv>().get(...)` (or `.post`, …) mounted with `.route()`. Helpers for that resource live in its `lib` folder. Auth, email, and other cross-cutting helpers stay in `backend/lib`. Do not mutate routers with `registerX(app)` helpers — that drops RPC inference.

Validate `json` / `query` / `param` with `@hono/zod-validator`. Session-gated routes use `requireSession` from `backend/middleware/session.ts`. Public routes (health, public estimate pages, Stripe webhooks) must not use it.

The SPA talks to the versioned API through `hc<V1Api>` in `frontend/lib/api.ts`. Auth cookies still go through the Better Auth client.

## Routing

Never hand-edit `src/frontend/route-tree.gen.ts`. The TanStack Router Vite plugin regenerates it from `src/frontend/routes/` during `bun run dev` / build. Add or change route files only.

Keep the split in `src`:

- `frontend/` — TanStack Router app
- `backend/` — Hono Worker

Do not add a `shared/` package. Prefer small duplicated constants/schemas in each side over a cross-cutting module.

Route files export the route definition only (`loader`, `beforeLoad`, `validateSearch`, `component: ThePage`). Do not define components in route files. Page components live in `frontend/features` and read params with `getRouteApi`.

## Database

Never apply migrations — local or remote — unless the user explicitly asks (`bun run db`, `bun run db:migrate:dev`, `wrangler d1 migrations apply`, drizzle-kit migrate/push). Generating SQL with `bun run db:generate` after schema edits is fine; leave applying to the user.

Never run remote DB commands (`wrangler d1 … --remote`) unless the user explicitly asks.

Auth, workspace, and `estimate` tables exist. Do not create payment / Stripe Connect tables unless the task asks. Link/click tables were removed.

Do not implement public estimate pages, Stripe Connect, PDF export, or subscriptions unless the current task asks for them.

Workspace is the tenant (the trade business). UI copy says **business**; code/API may still say workspace. Business URLs are `/dashboard/$slug` where `slug` is an opaque UUID (same as workspace id on create). Auth flow: sign in → `/welcome` if display name empty → `/dashboard` → create business → `/dashboard/$slug`. Load session, workspace lists, and membership through TanStack Router `beforeLoad` / `loader` plus `queryClient.query({ ...options, staleTime: "static" })` — do not fetch with `useEffect`.

Do not seed, insert, or copy data — real or fake — unless asked.

## Cloudflare

Resource identifiers live in Wrangler configuration. Do not hardcode Cloudflare IDs throughout application code.

Use bindings (`env.DB`, `env.EMAIL`) rather than the Cloudflare REST API.

Do not provision KV, Analytics Engine, R2, Queues, or Durable Objects unless the current task requires them.

Do not set `send_email.remote` to `true` in local Wrangler config.

## Fetch

Call `fetch` where the result is used. Do not wrap a one-off request in a named helper.

## UI

Install shadcn/ui components with the CLI. Do not copy component source by hand.

Prefer shadcn primitives over custom markup. Keep `globals.css` to theme tokens + base only.

Estimate builder and public accept/pay pages should be phone-first. Do not build desktop-dashboard-heavy layouts for the core flow unless asked.
