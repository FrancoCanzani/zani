import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

export const removeInvoice = new Hono<AppEnv>().delete(
  "/:invoiceId",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const invoiceId = c.req.param("invoiceId")

    const [existing] = await db
      .select({ id: invoice.id, status: invoice.status })
      .from(invoice)
      .where(
        and(
          eq(invoice.id, invoiceId),
          eq(invoice.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!existing) {
      return c.json({ error: "not_found" as const }, 404)
    }

    if (existing.status !== "draft") {
      return c.json({ error: "not_draft" as const }, 409)
    }

    await db.delete(invoice).where(eq(invoice.id, invoiceId))

    return c.json({ ok: true as const }, 200)
  }
)
