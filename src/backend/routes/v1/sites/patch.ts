import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"
import { canManageBusiness, parseWorkspaceRole } from "../workspaces/lib/schema"

import { loadSite } from "./lib/load"
import { updateSiteBodySchema } from "./lib/schema"
import { serializeSite } from "./lib/serialize"

export const patch = new Hono<AppEnv>().patch(
  "/:siteId",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", updateSiteBodySchema),
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

    const body = c.req.valid("json")
    const next = {
      name: body.name ?? existing.name,
      domain: body.domain ?? existing.domain,
    }
    await db.update(site).set(next).where(eq(site.id, existing.id))

    return c.json(
      {
        site: serializeSite({ ...existing, ...next }),
      },
      200
    )
  }
)
