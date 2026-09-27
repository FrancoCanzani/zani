import { and, count, desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { click, link } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"

import { workspaceFromContext } from "../workspaces/lib/context"

export const getLink = new Hono<AppEnv>().get(
  "/:code",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const code = c.req.param("code")
    const db = createDb(c.env)
    const [row] = await db
      .select()
      .from(link)
      .where(
        and(eq(link.workspaceId, current.workspace.id), eq(link.code, code))
      )
      .limit(1)

    if (!row || row.disabledAt) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const [total] = await db
      .select({ clicks: count() })
      .from(click)
      .where(eq(click.linkId, row.id))

    const recent = await db
      .select({
        id: click.id,
        occurredAt: click.occurredAt,
        country: click.country,
        referrerHost: click.referrerHost,
        device: click.device,
        browser: click.browser,
      })
      .from(click)
      .where(eq(click.linkId, row.id))
      .orderBy(desc(click.occurredAt))
      .limit(20)

    return c.json(
      {
        link: {
          id: row.id,
          code: row.code,
          name: row.name,
          destinationUrl: row.destinationUrl,
          createdAt: row.createdAt,
        },
        clicks: total?.clicks ?? 0,
        recent,
      },
      200
    )
  }
)
