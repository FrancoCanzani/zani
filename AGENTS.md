# Agent notes

## Scope

This repository is a development foundation for a URL-shortening SaaS. Do not implement product features unless the current task asks for them.

Do not add URL shortening, redirects, analytics, campaigns, billing, or dashboards unless explicitly requested.

Authentication is Better Auth email OTP on `/api/v1/auth`. Do not add passwords, OAuth, or extra auth providers unless asked.

## Comments

Never add JSDoc. Never add comments that narrate what the next lines do. Names, types, and signatures are the docs.

The only legal comment is a short `//` that explains a non-obvious **why**: a platform limit, a security constraint, a workaround, or a surprising default. If a competent reader would not ask "why is this here?", delete the comment. Prefer renaming over documenting.

## Tooling

- Package manager: Bun. Prefer `bun` commands. Do not introduce npm/pnpm/yarn unless a tool requires it.
- Monorepo: Turborepo.
- App: TanStack Router (file-based) + Hono on Cloudflare Workers.
- UI: shadcn/ui in `packages/ui`.
- Database: Drizzle + Cloudflare D1 in `packages/db`.
- Cache: Cloudflare KV binding `KV`.
- Email: Cloudflare Email binding `EMAIL`. In `ENVIRONMENT=development`, OTPs are logged to the console and mail is not sent.

`bun run check-types` is the typecheck to run.

HTTP API routes live under `/api/v1`. Keep `run_worker_first` on `/api/*`. Create Better Auth with `createAuth(env)` per request — do not use a module-level singleton.

## Routing

Never hand-edit `apps/web/src/frontend/route-tree.gen.ts`. The TanStack Router Vite plugin regenerates it from `apps/web/src/frontend/routes/` during `bun run dev` / build. Add or change route files only.

Keep the Pwor-style split in `apps/web/src`:

- `frontend/` — TanStack Router app
- `backend/` — Hono Worker
- `shared/` — types used by both

Route files should export `component: ThePage` (plus `validateSearch` if needed). Do not add a route component that only unpacks `useParams` / `useSearch` and forwards them as props.

## Database

Never run remote DB commands (`wrangler d1 … --remote`, drizzle-kit migrate/push against Cloudflare) unless the user explicitly asks.

`bun run dev` applies pending D1 migrations to the local Wrangler database only.

Do not create product tables (`links`, `campaigns`, `clicks`, `domains`, …) unless the task asks for them. Auth tables (`user`, `session`, `account`, `verification`) already exist.

Do not seed, insert, or copy data — real or fake — unless asked.

## Cloudflare

Resource identifiers live in Wrangler configuration. Do not hardcode Cloudflare IDs throughout application code.

Use bindings (`env.DB`, `env.KV`, `env.EMAIL`) rather than the Cloudflare REST API.

Do not provision R2, Queues, Analytics Engine, or Durable Objects unless the current task requires them.

Do not set `send_email.remote` to `true` in local Wrangler config.

## Fetch

Call `fetch` where the result is used. Do not wrap a one-off request in a named helper.

## UI

Install shadcn/ui components with the CLI. Do not copy component source by hand.

Prefer shadcn primitives over custom markup. Keep `globals.css` to theme tokens + base only.
