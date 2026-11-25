# Zani

Revenue attribution for small SaaS teams, self-hostable on Cloudflare.

Product line: **See which sources bring paying customers.**

A site gets pageviews and custom events (with properties) from `/script.js`, signups with first- and last-touch attribution through `zani.identify()`, and MRR from a read-only Stripe connection. The site dashboard joins them: traffic and revenue KPIs, revenue next to every breakdown, MRR movements, attribution by source, campaign and landing page, and a customer list.

## Revenue setup

1. Install the script on your site. Site settings and the empty dashboard show when the first real pageview arrives.
2. After signup, call `zani.identify(user.id, { email: user.email })`. Site settings has snippets for plain JavaScript, React, Next.js, Vue, and TypeScript types, and shows when the first signup arrives.
3. Pass the same id to Stripe as Checkout `client_reference_id` or customer `metadata.zani_user_id`. Customers with a matching email are linked too.
4. In site settings, press **Connect with Stripe** (OAuth, read-only scope) or paste a restricted key that can read Customers, Checkout Sessions, Subscriptions, and Invoices. Then run a sync.
5. Optionally add a webhook endpoint at `/api/v1/stripe-webhooks/<siteId>` for `customer.created`, `customer.updated`, `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.paid`, and save its signing secret.

### Stripe OAuth

**Connect with Stripe** appears when both values are set:

- `STRIPE_CLIENT_ID` (`ca_…`, from Stripe Connect settings) in `wrangler.jsonc` vars.
- `STRIPE_SECRET_KEY`, the platform account's secret key, as a Worker secret (`wrangler secret put STRIPE_SECRET_KEY`) and in `.dev.vars` locally.

Register `https://<your-host>/api/v1/stripe-oauth/callback` as a redirect URI in Stripe. `STRIPE_SECRET_KEY` is listed in `secrets.required`, so deploys fail until it is set; without OAuth, set it to any placeholder and keep `STRIPE_CLIENT_ID` empty. Sites then connect with a restricted key.

Stripe keys, OAuth tokens, and webhook secrets are encrypted with a key derived from `BETTER_AUTH_SECRET`. Rotating that secret means re-entering them.

In development, **Simulate data** on a site fills six months of pageviews, about 440 signups across sources, about 80 customers, and their MRR history.

Flow: sign in → `/welcome` (name) → `/businesses` (sites) → add a site → install `/script.js` → call `zani.identify(userId)` after signup → connect Stripe in site settings. A site page is `/businesses/$slug/sites/$siteId`; traffic and revenue share that dashboard. Invite links are `/invites/$token`.

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
