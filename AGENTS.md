# Agent notes

## Scope

This repository is a development foundation for a URL-shortening SaaS. Do not implement product features unless the current task asks for them.

Do not add URL shortening, redirects, analytics, campaigns, authentication, billing, or dashboards unless explicitly requested.

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

`bun run check-types` is the typecheck to run.

## Routing

Never hand-edit `apps/web/src/routeTree.gen.ts`. The TanStack Router Vite plugin regenerates it from `apps/web/src/routes/` during `bun run dev` / build. Add or change route files only.

Route files should export `component: ThePage` (plus `validateSearch` if needed). Do not add a route component that only unpacks `useParams` / `useSearch` and forwards them as props.

## Database

Never run DB commands (`db:generate`, `db:migrate`, `wrangler d1 …`, drizzle-kit apply/push, etc.) unless the user explicitly asks.

Do not create product tables (`users`, `links`, `campaigns`, `clicks`, `domains`, …) unless the task asks for them.

Do not seed, insert, or copy data — real or fake — unless asked.

## Cloudflare

Resource identifiers live in Wrangler configuration. Do not hardcode Cloudflare IDs throughout application code.

Use bindings (`env.DB`, `env.KV`) rather than the Cloudflare REST API.

Do not provision R2, Queues, Analytics Engine, or Durable Objects unless the current task requires them.

## Fetch

Call `fetch` where the result is used. Do not wrap a one-off request in a named helper.

## UI

Install shadcn/ui components with the CLI. Do not copy component source by hand.

Prefer shadcn primitives over custom markup. Keep `globals.css` to theme tokens + base only.
