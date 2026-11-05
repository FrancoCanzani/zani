import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { sendInvoiceMail } from "./lib/email"
import { invoiceTotals } from "./lib/helpers"
import { serializeInvoice } from "./lib/serialize"

export const remindInvoice = new Hono<AppEnv>().post(
  "/:invoiceId/remind",
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
        return c.json({ error: "not_outstanding" as const }, 409)
      default: {
        const exhaustive: never = existing.status
        return exhaustive
      }
    }

    const totals = invoiceTotals(
      existing.lineItems,
      existing.taxRateBps,
      existing.taxInclusive,
      existing.amountPaidCents
    )
    if (totals.balanceCents <= 0) {
      return c.json({ error: "not_outstanding" as const }, 409)
    }

    if (!existing.customerEmail?.trim()) {
      return c.json({ error: "customer_email_required" as const }, 400)
    }

    let delivered: boolean
    try {
      const result = await sendInvoiceMail(
        c.env,
        "reminder",
        existing,
        current.workspace
      )
      delivered = result.delivered
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "invoice email failed"
      )
      return c.json({ error: "email_failed" as const }, 502)
    }

    const now = nowMs()
    await db
      .update(invoice)
      .set({
        lastRemindedAt: now,
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

    return c.json({ invoice: serializeInvoice(row), delivered }, 200)
  }
)
