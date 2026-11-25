import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { stripeConnection } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { encryptSecret } from "../../../lib/secrets"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { loadConnection, serializeConnection } from "./lib/connection"
import { updateConnectionBodySchema } from "./lib/schema"

export const patch = new Hono<AppEnv>().patch(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", updateConnectionBodySchema),
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
    const existing = await loadConnection(db, matched.id)
    if (!existing) {
      return c.json({ error: "not_connected" as const }, 409)
    }

    const { webhookSecret } = c.req.valid("json")
    await db
      .update(stripeConnection)
      .set({
        webhookSecretCipher: webhookSecret
          ? await encryptSecret(c.env.BETTER_AUTH_SECRET, webhookSecret)
          : null,
        updatedAt: Date.now(),
      })
      .where(eq(stripeConnection.siteId, matched.id))

    const row = await loadConnection(db, matched.id)
    return c.json(
      { stripe: await serializeConnection(db, matched.id, row) },
      200
    )
  }
)
