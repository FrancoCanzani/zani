import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeInvoice } from "./lib/serialize"

export const getInvoice = new Hono<AppEnv>().get(
  "/:invoiceId",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const [row] = await db
      .select()
      .from(invoice)
      .where(
        and(
          eq(invoice.id, c.req.param("invoiceId")),
          eq(invoice.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!row) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ invoice: serializeInvoice(row) }, 200)
  }
)
