import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { funnel } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { funnelBodySchema } from "./lib/schema"
import { serializeFunnel } from "./lib/serialize"

export const patch = new Hono<AppEnv>().patch(
  "/:funnelId",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", funnelBodySchema),
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
    const [updated] = await db
      .update(funnel)
      .set({
        name: body.name,
        steps: JSON.stringify(body.steps),
        updatedAt: nowMs(),
      })
      .where(
        and(
          eq(funnel.siteId, matched.id),
          eq(funnel.id, c.req.param("funnelId"))
        )
      )
      .returning()
    if (!updated) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ funnel: serializeFunnel(updated) }, 200)
  }
)
