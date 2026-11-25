import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { stripeConnection } from "../../../db/schema"
import { createDb, type Database } from "../../../lib/db"
import { recomputeCustomer } from "../../../lib/revenue"
import { decryptSecret } from "../../../lib/secrets"
import {
  checkoutSessionLink,
  customerUpsert,
  customerValues,
  invoiceSnapshot,
  linkIdentity,
  StripeError,
  stripeGet,
  subscriptionEndSnapshot,
  verifyStripeSignature,
  type StripeCheckoutSession,
  type StripeCustomer,
  type StripeEvent,
  type StripeInvoice,
  type StripeSubscription,
} from "../../../lib/stripe"
import type { AppEnv } from "../../../types"

async function syncCustomer(
  db: Database,
  siteId: string,
  apiKey: string,
  customerId: string
) {
  const customer = await stripeGet<StripeCustomer>(
    apiKey,
    `customers/${customerId}`
  )
  const values = await customerValues(siteId, customer)
  if (values) await customerUpsert(db, values)
  await linkIdentity(db, siteId, customerId)
}

async function applyEvent(
  db: Database,
  siteId: string,
  apiKey: string,
  event: StripeEvent
) {
  switch (event.type) {
    case "customer.created":
    case "customer.updated":
      await syncCustomer(db, siteId, apiKey, event.data.object.id)
      break
    case "checkout.session.completed": {
      const session = await stripeGet<StripeCheckoutSession>(
        apiKey,
        `checkout/sessions/${event.data.object.id}`
      )
      if (session.customer) {
        await syncCustomer(db, siteId, apiKey, session.customer)
        const link = checkoutSessionLink(db, siteId, session)
        if (link) await link
        await linkIdentity(db, siteId, session.customer)
      }
      break
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = await stripeGet<StripeSubscription>(
        apiKey,
        `subscriptions/${event.data.object.id}`
      )
      const snapshot = subscriptionEndSnapshot(db, siteId, subscription)
      if (snapshot) {
        await snapshot
        await recomputeCustomer(db, siteId, subscription.customer)
      }
      break
    }
    case "invoice.paid": {
      const invoice = await stripeGet<StripeInvoice>(
        apiKey,
        `invoices/${event.data.object.id}`
      )
      const snapshot = invoiceSnapshot(db, siteId, invoice)
      if (snapshot) {
        await syncCustomer(db, siteId, apiKey, invoice.customer)
        await snapshot
        await recomputeCustomer(db, siteId, invoice.customer)
      }
      break
    }
    default:
      break
  }
}

export const post = new Hono<AppEnv>().post("/:siteId", async (c) => {
  const siteId = c.req.param("siteId")
  const db = createDb(c.env)
  const [connection] = await db
    .select()
    .from(stripeConnection)
    .where(eq(stripeConnection.siteId, siteId))
    .limit(1)
  if (!connection?.webhookSecretCipher) {
    return c.json({ error: "not_found" as const }, 404)
  }

  const payload = await c.req.text()
  const secret = await decryptSecret(
    c.env.BETTER_AUTH_SECRET,
    connection.webhookSecretCipher
  )
  const valid = await verifyStripeSignature(
    c.req.header("stripe-signature"),
    payload,
    secret
  )
  if (!valid) {
    return c.json({ error: "invalid_signature" as const }, 400)
  }

  const event = JSON.parse(payload) as StripeEvent
  const apiKey = await decryptSecret(
    c.env.BETTER_AUTH_SECRET,
    connection.apiKeyCipher
  )

  try {
    await applyEvent(db, siteId, apiKey, event)
  } catch (error) {
    // Stripe retries any non-2xx for days; a 4xx from its API (deleted object, revoked access) never succeeds on retry.
    if (!(error instanceof StripeError) || error.status >= 500) throw error
  }

  await db
    .update(stripeConnection)
    .set({ lastWebhookAt: Date.now() })
    .where(eq(stripeConnection.siteId, siteId))

  return c.json({ received: true as const }, 200)
})
