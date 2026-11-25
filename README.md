# Analytics

Revenue attribution for small SaaS teams, self-hostable on Cloudflare.

Product line: **See which sources bring paying customers.**

A site gets cookieless pageviews from `/script.js`, signups with first- and last-touch attribution through `zani.identify()`, and MRR from a read-only Stripe connection. The Revenue page joins them: MRR, new, expansion, contraction and churn, revenue by source, campaign and landing page, and a customer list.

## Revenue setup

1. Install the script on your site.
2. After signup, call `zani.identify(user.id, { email: user.email })`. The script sends the first and last source it kept in local storage on your domain.
3. Pass the same id to Stripe as Checkout `client_reference_id` or customer `metadata.zani_user_id`. Customers with a matching email are linked too.
4. In site settings, connect Stripe with a restricted key that can read Customers, Checkout Sessions, Subscriptions, and Invoices, then run a sync.
5. Optionally add a webhook endpoint at `/api/v1/stripe-webhooks/<siteId>` for `customer.created`, `customer.updated`, `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`, and save its signing secret.

Stripe keys and webhook secrets are encrypted with a key derived from `BETTER_AUTH_SECRET`. Rotating that secret means re-entering them.

In development, **Simulate data** on a site fills pageviews, 360 signups across sources, about 50 customers, and seven months of MRR history.

Flow: sign in → `/welcome` (name) → `/businesses` (sites) → add a site. A site page is `/businesses/$slug/sites/$siteId`. Invite links are `/invites/$token`.

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
- Sites: [http://localhost:5173/businesses](http://localhost:5173/businesses)
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

`/script.js` is served by the Worker. A site accepts a pageview only when the browser origin matches its domain. The write key is returned once, on create or when it is replaced.

Replace the local placeholder IDs with real resource IDs before deploying. Do not enable `remote: true` on `EMAIL` for local development.
