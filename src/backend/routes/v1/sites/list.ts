import { asc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { site } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeSite } from "./lib/serialize"

export const listSites = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const rows = await db
      .select({
        id: site.id,
        name: site.name,
        domain: site.domain,
        createdAt: site.createdAt,
        revokedAt: site.revokedAt,
      })
      .from(site)
      .where(eq(site.workspaceId, current.workspace.id))
      .orderBy(asc(site.name))

    return c.json({ sites: rows.map(serializeSite) }, 200)
  }
)
