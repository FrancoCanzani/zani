# SaaS foundation

Development foundation for a URL-shortening, link analytics, and campaigns product.

The first product slice is versioned HTTP APIs plus email OTP sign-in. Shortening, redirects, analytics, campaigns, and a dashboard are not implemented yet.

## Stack

- Bun + Turborepo
- TanStack Router (file-based) + React
- Tailwind CSS + shadcn/ui
- Hono on Cloudflare Workers
- Cloudflare D1 + KV + Email
- Drizzle
- Better Auth (email OTP)

## Apps and packages

- `apps/web` — TanStack Router SPA (`src/frontend`) and Hono Worker (`src/backend`)
- `packages/ui` — shared shadcn/ui components
- `packages/db` — Drizzle schema and D1 migrations

## Local development

```bash
bun install
cp apps/web/.dev.vars.example apps/web/.dev.vars
# Set BETTER_AUTH_SECRET to a long random value, e.g. `openssl rand -base64 32`
bun run dev
```

The Vite + Cloudflare dev server listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

In development, OTP codes are printed to the Worker console. Cloudflare Email is not called unless `ENVIRONMENT` is `production`.

Smoke checks:

- App: [http://127.0.0.1:43123](http://127.0.0.1:43123)
- Sign in: [http://127.0.0.1:43123/sign-in](http://127.0.0.1:43123/sign-in)
- Health: [http://127.0.0.1:43123/api/v1/health](http://127.0.0.1:43123/api/v1/health)

D1 (`DB`), KV (`KV`), and Email (`EMAIL`) are local Wrangler bindings. `bun run dev` applies pending migrations from `packages/db/migrations` to the local D1 database. No remote Cloudflare resources are required.

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
- `BETTER_AUTH_URL` — origin of the app (`http://127.0.0.1:43123` locally).
- `EMAIL_FROM` — verified sender address. `noreply@localhost` is fine locally; production needs a domain onboarded on Cloudflare Email.

Copy `.env.example` only if you need remote Drizzle Kit access to D1.

## Cloudflare resources

Bindings are declared in `apps/web/wrangler.jsonc`:

- `DB` — D1
- `KV` — KV
- `EMAIL` — Cloudflare Email sending

Replace the local placeholder IDs with real resource IDs before deploying. Do not enable `remote: true` on `EMAIL` for local development.
