import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeInvoiceSummary } from "./lib/serialize"

export const listInvoices = new Hono<AppEnv>().get(
  "/",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const rows = await db
      .select()
      .from(invoice)
      .where(eq(invoice.workspaceId, current.workspace.id))
      .orderBy(desc(invoice.updatedAt))

    return c.json(
      {
        invoices: rows.map(serializeInvoiceSummary),
      },
      200
    )
  }
)
