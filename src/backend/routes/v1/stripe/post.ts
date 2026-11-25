import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import {
  site,
  stripeConnection,
  stripeCustomer,
  stripeSubscription,
  visitor,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { openSecret, sealSecret } from "../../../lib/secret-box"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "../workspaces/lib/schema"

import { fetchStripeAccount } from "./lib/api"
import { connectStripeBodySchema } from "./lib/schema"
import { syncStripeSubscriptions } from "./lib/sync"

export const post = new Hono<AppEnv>()
  .post(
    "/:slug/stripe",
    requireSession,
    requireWorkspaceMember,
    zValidator("json", connectStripeBodySchema),
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canManageBusiness(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const body = c.req.valid("json")
      const account = await fetchStripeAccount(body.secretKey)
      if (!account.ok) {
        return c.json({ error: "invalid_key" as const }, 400)
      }

      const db = createDb(c.env)
      const now = nowMs()
      const apiKeyCipher = await sealSecret(
        c.env.BETTER_AUTH_SECRET,
        body.secretKey
      )
      const webhookSecretCipher = await sealSecret(
        c.env.BETTER_AUTH_SECRET,
        body.webhookSecret
      )

      const [existing] = await db
        .select()
        .from(stripeConnection)
        .where(eq(stripeConnection.workspaceId, current.workspace.id))
        .limit(1)

      const connectionId = existing?.id ?? newId()
      if (existing) {
        await db
          .update(stripeConnection)
          .set({
            stripeAccountId: account.data.id,
            apiKeyCipher,
            webhookSecretCipher,
            livemode: Boolean(account.data.livemode),
            updatedAt: now,
          })
          .where(eq(stripeConnection.id, existing.id))
      } else {
        await db.insert(stripeConnection).values({
          id: connectionId,
          workspaceId: current.workspace.id,
          stripeAccountId: account.data.id,
          apiKeyCipher,
          webhookSecretCipher,
          livemode: Boolean(account.data.livemode),
          createdAt: now,
          updatedAt: now,
        })
      }

      const synced = await syncStripeSubscriptions(
        db,
        current.workspace.id,
        body.secretKey
      )
      if (!synced.ok) {
        return c.json(
          {
            error: "sync_failed" as const,
            connection: {
              id: connectionId,
              stripeAccountId: account.data.id,
              livemode: Boolean(account.data.livemode),
              webhookPath: `/api/v1/stripe/webhook/${connectionId}`,
            },
          },
          502
        )
      }

      return c.json(
        {
          connection: {
            id: connectionId,
            stripeAccountId: account.data.id,
            livemode: Boolean(account.data.livemode),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
            webhookPath: `/api/v1/stripe/webhook/${connectionId}`,
          },
          synced: synced.synced,
        },
        200
      )
    }
  )
  .post(
    "/:slug/stripe/sync",
    requireSession,
    requireWorkspaceMember,
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canManageBusiness(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const db = createDb(c.env)
      const [connection] = await db
        .select()
        .from(stripeConnection)
        .where(eq(stripeConnection.workspaceId, current.workspace.id))
        .limit(1)
      if (!connection) {
        return c.json({ error: "not_connected" as const }, 404)
      }

      const apiKey = await openSecret(
        c.env.BETTER_AUTH_SECRET,
        connection.apiKeyCipher
      )
      const synced = await syncStripeSubscriptions(
        db,
        current.workspace.id,
        apiKey
      )
      if (!synced.ok) {
        return c.json({ error: "sync_failed" as const }, 502)
      }

      await db
        .update(stripeConnection)
        .set({ updatedAt: nowMs() })
        .where(eq(stripeConnection.id, connection.id))

      return c.json({ synced: synced.synced }, 200)
    }
  )
  .post(
    "/:slug/stripe/simulate",
    requireSession,
    requireWorkspaceMember,
    async (c) => {
      if (c.env.ENVIRONMENT !== "development") {
        return c.json({ error: "not_found" as const }, 404)
      }

      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canManageBusiness(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }

      const db = createDb(c.env)
      const now = nowMs()
      const sites = await db
        .select()
        .from(site)
        .where(eq(site.workspaceId, current.workspace.id))
      const siteId = sites[0]?.id
      if (!siteId) {
        return c.json({ error: "no_site" as const }, 400)
      }

      const sources = [
        {
          firstUtmSource: "twitter",
          firstUtmMedium: "social",
          firstUtmCampaign: "launch",
          firstReferrerHost: "t.co",
          mrr: 2900,
        },
        {
          firstUtmSource: "google",
          firstUtmMedium: "cpc",
          firstUtmCampaign: "brand",
          firstReferrerHost: "google.com",
          mrr: 7900,
        },
        {
          firstUtmSource: "",
          firstUtmMedium: "",
          firstUtmCampaign: "",
          firstReferrerHost: "news.ycombinator.com",
          mrr: 2000,
        },
        {
          firstUtmSource: "",
          firstUtmMedium: "",
          firstUtmCampaign: "",
          firstReferrerHost: "",
          mrr: 0,
        },
      ]

      let customers = 0
      for (const [index, source] of sources.entries()) {
        const email = `founder${index + 1}@example.com`
        const userId = `user_${index + 1}`
        const anonymousId = crypto.randomUUID()
        await db.insert(visitor).values({
          id: newId(),
          siteId,
          anonymousId,
          userId,
          email,
          firstPath: index % 2 === 0 ? "/" : "/pricing",
          firstReferrerHost: source.firstReferrerHost,
          firstReferrerPath: source.firstReferrerHost ? "/" : "",
          firstUtmSource: source.firstUtmSource,
          firstUtmMedium: source.firstUtmMedium,
          firstUtmCampaign: source.firstUtmCampaign,
          firstUtmContent: "",
          firstUtmTerm: "",
          firstSeenAt: now - (index + 1) * 86_400_000,
          lastSeenAt: now,
          identifiedAt: now - index * 43_200_000,
        })

        if (source.mrr <= 0) continue
        const stripeCustomerId = `cus_sim_${index + 1}`
        await db.insert(stripeCustomer).values({
          id: newId(),
          workspaceId: current.workspace.id,
          stripeCustomerId,
          email,
          name: `Founder ${index + 1}`,
          metadataUserId: userId,
          createdAt: now,
          updatedAt: now,
        })
        await db.insert(stripeSubscription).values({
          id: newId(),
          workspaceId: current.workspace.id,
          stripeSubscriptionId: `sub_sim_${index + 1}`,
          stripeCustomerId,
          status: "active",
          mrrCents: source.mrr,
          currency: "usd",
          interval: "month",
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
        })
        customers += 1
      }

      return c.json({ customers, signups: sources.length }, 200)
    }
  )
