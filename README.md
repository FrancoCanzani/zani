# Invoices (foundation)

Development foundation for a SaaS that helps solo tradespeople and tiny crews send invoices and get paid.

Product line: **Send invoices customers actually pay.**

The first product slice is versioned HTTP APIs, email OTP sign-in, display-name completion, businesses, customers, products, and an invoice builder. Public share links, collections automation, Stripe, and subscriptions are not implemented yet.

Flow: sign in → `/welcome` (name) → `/businesses` → set up business → `/businesses/$slug` (business view; slug is a UUID). Invite links are `/invites/$token`.

## Stack

- Bun
- TanStack Router (file-based) + React
- Tailwind CSS + shadcn/ui
- Hono on Cloudflare Workers (Zod validation + RPC client)
- Cloudflare D1 + Email
- Drizzle
- Better Auth (email OTP)

## App

The TanStack Router SPA lives in `src/frontend` and the Hono Worker lives in `src/backend`. The typed API is `src/backend/api.ts`; Better Auth is mounted on the Worker entry beside it. shadcn/ui lives in `src/frontend`. The Drizzle schema and D1 migrations live in `src/backend/db`.

## Local development

```bash
bun install
cp .dev.vars.example .dev.vars
# Set BETTER_AUTH_SECRET to a long random value, e.g. `openssl rand -base64 32`
bun run dev
```

The Vite + Cloudflare dev server listens on [http://localhost:5173](http://localhost:5173).

In development, OTP codes and invite accept URLs are printed to the Worker console. Cloudflare Email is not called unless `ENVIRONMENT` is `production`. The last opened workspace slug is stored in `localStorage` under `workspace-slug`.

Smoke checks:

- App: [http://localhost:5173](http://localhost:5173)
- Sign in: [http://localhost:5173/sign-in](http://localhost:5173/sign-in)
- Welcome (name): [http://localhost:5173/welcome](http://localhost:5173/welcome)
- Businesses: [http://localhost:5173/businesses](http://localhost:5173/businesses)
- Health: [http://localhost:5173/api/v1/health](http://localhost:5173/api/v1/health)

D1 (`DB`) and Email (`EMAIL`) are local Wrangler bindings. Generate migrations with `bun run db:generate`; apply locally yourself with `bun run db:migrate:dev` when ready. No remote Cloudflare resources are required.

## Checks

```bash
bun run check-types
bun run lint
bun run build
```

## Environment

Worker secrets belong in `.dev.vars` (see `.dev.vars.example`). Do not commit secrets.

Wrangler vars in `wrangler.jsonc`:

- `ENVIRONMENT` — `development` locally. Set to `production` before deploying so OTP mail goes through Cloudflare Email instead of the console.
- `BETTER_AUTH_URL` — origin of the app (`http://localhost:5173` locally).
- `EMAIL_FROM` — verified sender address. `noreply@localhost` is fine locally; production needs a domain onboarded on Cloudflare Email.

Copy `.env.example` only if you need remote Drizzle Kit access to D1.

## Cloudflare resources

Bindings are declared in `wrangler.jsonc`:

- `DB` — D1
- `EMAIL` — Cloudflare Email sending

Replace the local placeholder IDs with real resource IDs before deploying. Do not enable `remote: true` on `EMAIL` for local development.
