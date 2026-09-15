# SaaS foundation

Development foundation for a URL-shortening, link analytics, and campaigns product.

This repository is structure and infrastructure only. It does not implement shortening, redirects, analytics, campaigns, authentication, or dashboards.

## Stack

- Bun + Turborepo
- TanStack Router (file-based) + React
- Tailwind CSS + shadcn/ui
- Hono on Cloudflare Workers
- Cloudflare D1 + KV
- Drizzle (schema package only — no product tables yet)

## Apps and packages

- `apps/web` — TanStack Router SPA (`src/frontend`) and Hono Worker (`src/backend`)
- `packages/ui` — shared shadcn/ui components
- `packages/db` — Drizzle + D1 entry points

## Local development

```bash
bun install
bun run dev
```

The Vite + Cloudflare dev server listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

Smoke checks:

- App: [http://127.0.0.1:43123](http://127.0.0.1:43123)
- Worker: [http://127.0.0.1:43123/api/health](http://127.0.0.1:43123/api/health)

D1 (`DB`) and KV (`KV`) are local Wrangler bindings. No remote Cloudflare resources are required for `bun run dev`.

## Checks

```bash
bun run check-types
bun run lint
bun run build
```

## Environment

Copy `.env.example` if you need remote Drizzle Kit access to D1. Local development does not need those values.

Worker secrets, if added later, belong in `apps/web/.dev.vars` (see `.dev.vars.example`). Do not commit secrets.

## Cloudflare resources

Bindings are declared in `apps/web/wrangler.jsonc`:

- `DB` — D1
- `KV` — KV

Replace the local placeholder IDs with real resource IDs before deploying.
