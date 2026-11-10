import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { randomToken, sha256Hex } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { loadSite } from "./lib/load"
import { serializeSite } from "./lib/serialize"

export const replaceWriteKey = new Hono<AppEnv>().post(
  "/:siteId/write-key",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const role = parseWorkspaceRole(current.membership.role)
    if (!role || !canManageBusiness(role)) {
      return c.json({ error: "forbidden" as const }, 403)
    }

    const db = createDb(c.env)
    const existing = await loadSite(
      db,
      current.workspace.id,
      c.req.param("siteId")
    )
    if (!existing) {
      return c.json({ error: "not_found" as const }, 404)
    }
    if (existing.revokedAt !== null) {
      return c.json({ error: "revoked" as const }, 409)
    }

    const writeKey = randomToken()
    const writeKeyHash = await sha256Hex(writeKey)
    await db.update(site).set({ writeKeyHash }).where(eq(site.id, existing.id))

    return c.json(
      {
        site: serializeSite(existing),
        writeKey,
      },
      200
    )
  }
)
