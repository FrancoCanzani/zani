import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { stripeConnection } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { openSecret } from "../../../lib/secret-box"
import type { AppEnv } from "../../../types"

import {
  retrieveStripeCustomer,
  retrieveStripeSubscription,
  type StripeCustomer,
  type StripeSubscription,
} from "./lib/api"
import {
  deleteStripeSubscription,
  upsertStripeCustomer,
  upsertStripeSubscription,
} from "./lib/ledger"
import { verifyStripeSignature } from "./lib/webhook"

type StripeEvent = {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

export const webhook = new Hono<AppEnv>().post(
  "/webhook/:connectionId",
  async (c) => {
    const connectionId = c.req.param("connectionId")
    const payload = await c.req.text()
    const signature = c.req.header("stripe-signature")
    if (!signature) {
      return c.json({ error: "missing_signature" as const }, 400)
    }

    const db = createDb(c.env)
    const [connection] = await db
      .select()
      .from(stripeConnection)
      .where(eq(stripeConnection.id, connectionId))
      .limit(1)
    if (!connection) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const webhookSecret = await openSecret(
      c.env.BETTER_AUTH_SECRET,
      connection.webhookSecretCipher
    )
    const valid = await verifyStripeSignature({
      payload,
      header: signature,
      secret: webhookSecret,
    })
    if (!valid) {
      return c.json({ error: "invalid_signature" as const }, 400)
    }

    let event: StripeEvent
    try {
      event = JSON.parse(payload) as StripeEvent
    } catch {
      return c.json({ error: "invalid_json" as const }, 400)
    }

    const apiKey = await openSecret(
      c.env.BETTER_AUTH_SECRET,
      connection.apiKeyCipher
    )

    switch (event.type) {
      case "customer.created":
      case "customer.updated": {
        await upsertStripeCustomer(
          db,
          connection.workspaceId,
          event.data.object as unknown as StripeCustomer
        )
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const object = event.data.object as unknown as StripeSubscription
        if (event.type === "customer.subscription.deleted") {
          await deleteStripeSubscription(
            db,
            connection.workspaceId,
            object.id
          )
          break
        }
        const detailed = await retrieveStripeSubscription(apiKey, object.id)
        if (detailed.ok) {
          await upsertStripeSubscription(
            db,
            connection.workspaceId,
            detailed.data
          )
        } else {
          await upsertStripeSubscription(db, connection.workspaceId, object)
        }
        break
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as {
          customer?: string | null
          subscription?: string | null
        }
        if (invoice.subscription) {
          const detailed = await retrieveStripeSubscription(
            apiKey,
            invoice.subscription
          )
          if (detailed.ok) {
            await upsertStripeSubscription(
              db,
              connection.workspaceId,
              detailed.data
            )
          }
        } else if (typeof invoice.customer === "string") {
          const customer = await retrieveStripeCustomer(
            apiKey,
            invoice.customer
          )
          if (customer.ok) {
            await upsertStripeCustomer(
              db,
              connection.workspaceId,
              customer.data
            )
          }
        }
        break
      }
      default:
        break
    }

    return c.json({ received: true }, 200)
  }
)
