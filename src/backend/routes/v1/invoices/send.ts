import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { serializeInvoice } from "./lib/serialize"

export const sendInvoice = new Hono<AppEnv>().post(
  "/:invoiceId/send",
  requireSession,
  requireWorkspaceMember,
  async (c) => {
    const current = workspaceFromContext(c.var)
    const db = createDb(c.env)
    const invoiceId = c.req.param("invoiceId")

    const [existing] = await db
      .select()
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

    if (!existing.customerName.trim()) {
      return c.json({ error: "customer_required" as const }, 400)
    }

    const now = nowMs()
    await db
      .update(invoice)
      .set({
        status: "sent",
        sentAt: now,
        updatedAt: now,
      })
      .where(eq(invoice.id, invoiceId))

    const [row] = await db
      .select()
      .from(invoice)
      .where(eq(invoice.id, invoiceId))
      .limit(1)

    if (!row) {
      return c.json({ error: "not_found" as const }, 404)
    }

    return c.json({ invoice: serializeInvoice(row) }, 200)
  }
)
