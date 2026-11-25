# Zani

Acquisition → Stripe revenue attribution for a site you own.

Product line: **which channels bring paying customers**, not vanity pageviews.

v1 records sites, pageviews, durable anonymous visitors, first-touch, `zani.identify`, and Stripe MRR attributed to that first touch. Subscriptions for Zani itself are not implemented yet. We do not take a cut of your Stripe payments.

Flow: sign in → `/welcome` (name) → `/businesses` (sites) → add a site → install `/script.js` → call `zani.identify(userId)` after signup → connect Stripe on **Revenue**. A site page is `/businesses/$slug/sites/$siteId`. Revenue is `/businesses/$slug/revenue`. Invite links are `/invites/$token`.

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

## Tracking

Paste the install snippet before `</body>`. The script:

- Sends pageviews (and SPA navigations) to `/api/v1/collect`
- Persists an anonymous id + first-touch (landing, referrer, UTMs) in `localStorage`
- Exposes `zani.track(name, props?)` and `zani.identify(userId, { email }?)`

Identify with the same user id or email you put on the Stripe customer (`metadata.userId` or email) so Revenue can join first-touch → MRR.

## Revenue

On `/businesses/$slug/revenue`:

1. Connect a Stripe **restricted or secret key** plus a webhook signing secret (`whsec_…`). Keys are encrypted at rest.
2. Point Stripe webhooks at the endpoint shown after connect (`customer.*`, `customer.subscription.*`, `invoice.paid`).
3. Read MRR, customers, signups, ARPU, churn, and the **Source → Signups → Customers → MRR** table.

In development, **Simulate** seeds identified visitors and attributed subscriptions without a real Stripe account.

## Local development

```bash
bun install
cp .dev.vars.example .dev.vars
# Set BETTER_AUTH_SECRET to a long random value, e.g. `openssl rand -base64 32`
bun run db:migrate:dev
bun run dev
```

The Vite + Cloudflare dev server listens on [http://localhost:5173](http://localhost:5173).

In development, OTP codes and invite accept URLs are printed to the Worker console. Cloudflare Email is not called unless `ENVIRONMENT` is `production`. The last opened workspace slug is stored in `localStorage` under `workspace-slug`.

Smoke checks:

- App: [http://localhost:5173](http://localhost:5173)
- Sign in: [http://localhost:5173/sign-in](http://localhost:5173/sign-in)
- Welcome (name): [http://localhost:5173/welcome](http://localhost:5173/welcome)
- Sites: [http://localhost:5173/businesses](http://localhost:5173/businesses)
- Health: [http://localhost:5173/api/v1/health](http://localhost:5173/api/v1/health)

D1 (`DB`) and Email (`EMAIL`) are local Wrangler bindings. Generate migrations with `bun run db:generate`; apply locally with `bun run db:migrate:dev` when ready. No remote Cloudflare resources are required for day-to-day work.

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

`/script.js` is served by the Worker. A site accepts a pageview only when the browser origin matches its domain. The write key is returned once, on create or when it is replaced.

Replace the local placeholder IDs with real resource IDs before deploying. Do not enable `remote: true` on `EMAIL` for local development.
