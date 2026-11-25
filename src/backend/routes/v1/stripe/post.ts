import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { stripeConnection } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { decryptSecret, encryptSecret } from "../../../lib/secrets"
import { StripeError, stripeGet } from "../../../lib/stripe"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { loadConnection, serializeConnection } from "./lib/connection"
import { connectBodySchema } from "./lib/schema"
import { parseSyncPhase, runSyncStep } from "./lib/sync"

export const post = new Hono<AppEnv>()
  .post(
    "/",
    requireSession,
    requireWorkspaceMember,
    zValidator("json", connectBodySchema),
    async (c) => {
      const current = workspaceFromContext(c.var)
      const role = parseWorkspaceRole(current.membership.role)
      if (!role || !canManageBusiness(role)) {
        return c.json({ error: "forbidden" as const }, 403)
      }
      const db = createDb(c.env)
      const matched = await loadSite(
        db,
        current.workspace.id,
        c.req.param("siteId") ?? ""
      )
      if (!matched) {
        return c.json({ error: "not_found" as const }, 404)
      }

      const body = c.req.valid("json")
      try {
        await stripeGet(body.apiKey, "customers", { limit: "1" })
      } catch (error) {
        const message =
          error instanceof StripeError
            ? error.message
            : "Could not reach Stripe."
        return c.json({ error: "stripe" as const, message }, 400)
      }

      const now = Date.now()
      const values = {
        siteId: matched.id,
        apiKeyCipher: await encryptSecret(c.env.BETTER_AUTH_SECRET, body.apiKey),
        apiKeyHint: body.apiKey.slice(-4),
        webhookSecretCipher: body.webhookSecret
          ? await encryptSecret(c.env.BETTER_AUTH_SECRET, body.webhookSecret)
          : null,
        livemode: body.apiKey.includes("_live_"),
        syncPhase: "customers",
        syncCursor: null,
        syncedAt: null,
        syncError: null,
        createdAt: now,
        updatedAt: now,
      }
      await db
        .insert(stripeConnection)
        .values(values)
        .onConflictDoUpdate({
          target: stripeConnection.siteId,
          set: { ...values, createdAt: undefined },
        })

      const row = await loadConnection(db, matched.id)
      return c.json(
        { stripe: await serializeConnection(db, matched.id, row) },
        200
      )
    }
  )
  .post("/sync", requireSession, requireWorkspaceMember, async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }
    const db = createDb(c.env)
    const matched = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId") ?? ""
    )
    if (!matched) {
      return c.json({ error: "not_found" as const }, 404)
    }
    const row = await loadConnection(db, matched.id)
    if (!row) {
      return c.json({ error: "not_connected" as const }, 409)
    }

    const phase = parseSyncPhase(row.syncPhase)
    const restart = phase === "done" && c.req.query("restart") === "1"
    try {
      const result = await runSyncStep(db, {
        siteId: matched.id,
        apiKey: await decryptSecret(c.env.BETTER_AUTH_SECRET, row.apiKeyCipher),
        phase: restart ? "customers" : phase,
        cursor: restart ? null : row.syncCursor,
      })
      return c.json(
        { sync: { ...result, done: result.phase === "done" } },
        200
      )
    } catch (error) {
      const message =
        error instanceof StripeError ? error.message : "Sync failed."
      await db
        .update(stripeConnection)
        .set({ syncError: message, updatedAt: Date.now() })
        .where(eq(stripeConnection.siteId, matched.id))
      return c.json({ error: "sync_failed" as const, message }, 502)
    }
  })
