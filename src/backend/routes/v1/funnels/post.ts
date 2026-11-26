import { zValidator } from "@hono/zod-validator"
import { count, eq } from "drizzle-orm"
import { Hono } from "hono"

import { funnel } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { loadSite } from "../sites/lib/load"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { funnelBodySchema } from "./lib/schema"
import { serializeFunnel } from "./lib/serialize"

const maxFunnelsPerSite = 20

export const post = new Hono<AppEnv>().post(
  "/",
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

    const [existing] = await db
      .select({ value: count() })
      .from(funnel)
      .where(eq(funnel.siteId, matched.id))
    if ((existing?.value ?? 0) >= maxFunnelsPerSite) {
      return c.json({ error: "limit" as const }, 409)
    }

    const body = c.req.valid("json")
    const now = nowMs()
    const created = {
      id: newId(),
      siteId: matched.id,
      name: body.name,
      steps: JSON.stringify(body.steps),
      createdAt: now,
      updatedAt: now,
    }
    await db.insert(funnel).values(created)

    return c.json({ funnel: serializeFunnel(created) }, 201)
  }
)
