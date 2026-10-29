import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { invoiceTotals } from "./lib/helpers"
import { serializeInvoice } from "./lib/serialize"

export const markInvoicePaid = new Hono<AppEnv>().post(
  "/:invoiceId/mark-paid",
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

    switch (existing.status) {
      case "sent":
      case "partially_paid":
        break
      case "draft":
      case "paid":
      case "void":
        return c.json({ error: "invalid_status" as const }, 409)
      default: {
        const exhaustive: never = existing.status
        return exhaustive
      }
    }

    const totals = invoiceTotals(
      existing.lineItems,
      existing.taxRateBps,
      existing.taxInclusive,
      0
    )
    const now = nowMs()

    await db
      .update(invoice)
      .set({
        status: "paid",
        amountPaidCents: totals.totalCents,
        paidAt: now,
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
