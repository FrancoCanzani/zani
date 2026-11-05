import { zValidator } from "@hono/zod-validator"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import { Hono } from "hono"

import { customer, invoice, type InvoiceLineItem } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/utils"
import { requireSession } from "../../../middleware/session"
import { requireWorkspaceMember } from "../../../middleware/workspace"
import type { AppEnv } from "../../../types"
import { workspaceFromContext } from "../workspaces/lib/context"

import { createInvoiceBodySchema } from "./lib/schema"
import { claimInvoiceNumber, isoDateInDays, todayIsoDate } from "./lib/number"
import { serializeInvoice } from "./lib/serialize"

const DEFAULT_DUE_DAYS = 30

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

    const [selected] = body.customerId
      ? await db
          .select()
          .from(customer)
          .where(
            and(
              eq(customer.id, body.customerId),
              eq(customer.workspaceId, current.workspace.id)
            )
          )
          .limit(1)
      : []

    if (body.customerId && !selected) {
      return c.json({ error: "customer_not_found" as const }, 404)
    }

    const [previous] = await db
      .select({ bankDetails: invoice.bankDetails })
      .from(invoice)
      .where(
        and(
          eq(invoice.workspaceId, current.workspace.id),
          isNotNull(invoice.bankDetails)
        )
      )
      .orderBy(desc(invoice.createdAt))
      .limit(1)

    const number = await claimInvoiceNumber(c.env, current.workspace.id)
    if (!number) {
      return c.json({ error: "number_unavailable" as const }, 409)
    }

    const created = {
      id,
      workspaceId: current.workspace.id,
      publicSlug: newId(),
      status: "draft" as const,
      number,
      customerId: selected?.id ?? null,
      customerName: selected?.name ?? "",
      customerPhone: selected?.phone ?? null,
      customerEmail: selected?.email ?? null,
      customerAddress: selected?.address ?? null,
      customerTaxId: selected?.taxId ?? null,
      currency: current.workspace.defaultCurrency,
      issueDate: todayIsoDate(now),
      dueDate: isoDateInDays(DEFAULT_DUE_DAYS, now) as string | null,
      paymentTerms: current.workspace.defaultPaymentTerms,
      notes: null as string | null,
      terms: null as string | null,
      bankDetails: previous?.bankDetails ?? null,
      taxName: current.workspace.defaultTaxName,
      taxRateBps: current.workspace.defaultTaxRateBps,
      taxInclusive: current.workspace.taxInclusive,
      lineItems: [] as InvoiceLineItem[],
      amountPaidCents: 0,
      createdByUserId: c.var.user.id,
      sentAt: null as number | null,
      lastRemindedAt: null as number | null,
      paidAt: null as number | null,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(invoice).values(created)

    return c.json({ invoice: serializeInvoice(created) }, 201)
  }
)
