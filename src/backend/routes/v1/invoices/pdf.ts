import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { invoicePdfFilename, renderInvoicePdf } from "./lib/pdf"

export const invoicePdf = new Hono<AppEnv>().get(
  "/:invoiceId/pdf",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const invoiceId = c.req.param("invoiceId")
    const [row] = await db
      .select()
      .from(invoice)
      .where(
        and(
          eq(invoice.id, invoiceId),
          eq(invoice.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!row) {
      return c.json({ error: "not_found" as const }, 404)
    }

    const bytes = await renderInvoicePdf(row, current.workspace)
    const filename = invoicePdfFilename(row.number)
    const body = new Uint8Array(bytes)
    return c.body(body.buffer, 200, {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    })
  }
)
