import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { invoice } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { resolveInvoiceCustomer } from "./lib/customers"
import { updateInvoiceBodySchema } from "./lib/schema"
import { serializeInvoice } from "./lib/serialize"

export const updateInvoice = new Hono<AppEnv>().patch(
  "/:invoiceId",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", updateInvoiceBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const invoiceId = c.req.param("invoiceId")

    const [existing] = await db
      .select({
        id: invoice.id,
        status: invoice.status,
        number: invoice.number,
      })
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

    if (existing.status === "paid" || existing.status === "void") {
      return c.json({ error: "immutable" as const }, 409)
    }

    if (body.number !== existing.number) {
      const [conflict] = await db
        .select({ id: invoice.id })
        .from(invoice)
        .where(
          and(
            eq(invoice.workspaceId, current.workspace.id),
            eq(invoice.number, body.number)
          )
        )
        .limit(1)

      if (conflict) {
        return c.json({ error: "number_taken" as const }, 409)
      }
    }

    const resolved = await resolveInvoiceCustomer(c.env, current.workspace.id, {
      customerId: body.customerId,
      customerName: body.customerName,
      customerPhone: body.customerPhone ?? null,
      customerEmail: body.customerEmail ?? null,
      customerAddress: body.customerAddress ?? null,
      customerTaxId: body.customerTaxId ?? null,
    })

    if ("error" in resolved) {
      return c.json({ error: resolved.error }, 404)
    }

    const now = nowMs()
    await db
      .update(invoice)
      .set({
        number: body.number,
        customerId: resolved.customerId,
        customerName: resolved.customerName,
        customerPhone: resolved.customerPhone,
        customerEmail: resolved.customerEmail,
        customerAddress: resolved.customerAddress,
        customerTaxId: resolved.customerTaxId,
        currency: body.currency,
        issueDate: body.issueDate,
        dueDate: body.dueDate,
        paymentTerms: body.paymentTerms ?? null,
        notes: body.notes ?? null,
        terms: null,
        bankDetails: body.bankDetails ?? null,
        taxName: body.taxName ?? null,
        taxRateBps: body.taxRateBps,
        taxInclusive: body.taxInclusive,
        lineItems: body.lineItems,
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
