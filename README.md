# SaaS foundation

Development foundation for a URL-shortening, link analytics, and campaigns product.

The first product slice is versioned HTTP APIs, email OTP sign-in, and workspace onboarding. Shortening, redirects, analytics, campaigns, and a dashboard are not implemented yet.

Signed-in users land on `/w/$slug`. Accounts without a workspace go through `/onboarding` to create one and optionally invite members. Invite links are `/invites/$token`.

## Stack

- Bun + Turborepo
- TanStack Router (file-based) + React
- Tailwind CSS + shadcn/ui
- Hono on Cloudflare Workers (Zod validation + RPC client)
- Cloudflare D1 + KV + Email
- Drizzle
- Better Auth (email OTP)

## Apps and packages

- `apps/web` — TanStack Router SPA (`src/frontend`) and Hono Worker (`src/backend`). Typed API lives in `src/backend/api.ts`; Better Auth is mounted on the Worker entry beside it.
- `packages/ui` — shared shadcn/ui components
- `packages/db` — Drizzle schema and D1 migrations

## Local development

```bash
bun install
cp apps/web/.dev.vars.example apps/web/.dev.vars
# Set BETTER_AUTH_SECRET to a long random value, e.g. `openssl rand -base64 32`
bun run dev
```

The Vite + Cloudflare dev server listens on [http://localhost:5173](http://localhost:5173).

In development, OTP codes and invite accept URLs are printed to the Worker console. Cloudflare Email is not called unless `ENVIRONMENT` is `production`. The last opened workspace slug is stored in `localStorage` under `workspace-slug`.

Smoke checks:

- App: [http://localhost:5173](http://localhost:5173)
- Sign in: [http://localhost:5173/sign-in](http://localhost:5173/sign-in)
- Onboarding: [http://localhost:5173/onboarding](http://localhost:5173/onboarding)
- Health: [http://localhost:5173/api/v1/health](http://localhost:5173/api/v1/health)

D1 (`DB`), KV (`KV`), and Email (`EMAIL`) are local Wrangler bindings. Generate and apply local migrations with `bun run db` (from the repo root or `apps/web`). No remote Cloudflare resources are required.

## Checks

```bash
bun run check-types
bun run lint
bun run build
```

## Environment

Worker secrets belong in `apps/web/.dev.vars` (see `.dev.vars.example`). Do not commit secrets.

Wrangler vars in `apps/web/wrangler.jsonc`:

- `ENVIRONMENT` — `development` locally. Set to `production` before deploying so OTP mail goes through Cloudflare Email instead of the console.
- `BETTER_AUTH_URL` — origin of the app (`http://localhost:5173` locally).
- `EMAIL_FROM` — verified sender address. `noreply@localhost` is fine locally; production needs a domain onboarded on Cloudflare Email.

Copy `.env.example` only if you need remote Drizzle Kit access to D1.

## Cloudflare resources

Bindings are declared in `apps/web/wrangler.jsonc`:

- `DB` — D1
- `KV` — KV
- `EMAIL` — Cloudflare Email sending

Replace the local placeholder IDs with real resource IDs before deploying. Do not enable `remote: true` on `EMAIL` for local development.
