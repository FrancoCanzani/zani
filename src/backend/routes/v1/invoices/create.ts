import { zValidator } from "@hono/zod-validator"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import {
  customer,
  invoice,
  workspace,
  type InvoiceLineItem,
} from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { createInvoiceBodySchema } from "./lib/schema"
import { formatInvoiceNumber, todayIsoDate } from "./lib/number"
import { serializeInvoice } from "./lib/serialize"

export const createInvoice = new Hono<AppEnv>().post(
  "/",
  requireSession,
  requireWorkspaceMember,
  zValidator("json", createInvoiceBodySchema),
  async (c) => {
    const current = workspaceFromContext(c.var)
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const now = nowMs()
    const id = newId()
    const sequence = current.workspace.nextInvoiceNumber
    const number = formatInvoiceNumber(
      current.workspace.invoiceNumberPrefix,
      sequence
    )

    const [selected] = await db
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.id, body.customerId),
          eq(customer.workspaceId, current.workspace.id)
        )
      )
      .limit(1)

    if (!selected) {
      return c.json({ error: "customer_not_found" as const }, 404)
    }

    const created = {
      id,
      workspaceId: current.workspace.id,
      publicSlug: newId(),
      status: "draft" as const,
      number,
      customerId: selected.id,
      customerName: selected.name,
      customerPhone: selected.phone,
      customerEmail: selected.email,
      customerAddress: selected.address,
      customerTaxId: selected.taxId,
      currency: current.workspace.defaultCurrency,
      issueDate: todayIsoDate(now),
      dueDate: null as string | null,
      paymentTerms: current.workspace.defaultPaymentTerms,
      notes: null as string | null,
      terms: null as string | null,
      bankDetails: null as string | null,
      taxName: current.workspace.defaultTaxName,
      taxRateBps: current.workspace.defaultTaxRateBps,
      taxInclusive: current.workspace.taxInclusive,
      lineItems: [] as InvoiceLineItem[],
      amountPaidCents: 0,
      createdByUserId: c.var.user.id,
      sentAt: null as number | null,
      paidAt: null as number | null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(invoice).values(created)
    await db
      .update(workspace)
      .set({
        nextInvoiceNumber: sequence + 1,
        updatedAt: now,
      })
      .where(eq(workspace.id, current.workspace.id))

    return c.json({ invoice: serializeInvoice(created) }, 201)
  }
)
