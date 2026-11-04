import { and, eq, sql } from "drizzle-orm"

import { invoice, workspace } from "../../../../db/schema"
import { createDb } from "../../../../lib/db"

const MAX_NUMBER_ATTEMPTS = 20

export function formatInvoiceNumber(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(4, "0")}`
}

export function todayIsoDate(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10)
}

export function isoDateInDays(days: number, now = Date.now()) {
  return todayIsoDate(now + days * 86_400_000)
}

// Increment-and-return in one statement so concurrent creates never share a
// sequence. Numbers can still be taken by a draft renamed by hand, so skip those.
export async function claimInvoiceNumber(env: Env, workspaceId: string) {
  const db = createDb(env)

  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
    const [claimed] = await db
      .update(workspace)
      .set({ nextInvoiceNumber: sql`${workspace.nextInvoiceNumber} + 1` })
      .where(eq(workspace.id, workspaceId))
      .returning({
        sequence: workspace.nextInvoiceNumber,
        prefix: workspace.invoiceNumberPrefix,
      })

    if (!claimed) {
      return null
    }

    const number = formatInvoiceNumber(claimed.prefix, claimed.sequence - 1)
    const [taken] = await db
      .select({ id: invoice.id })
      .from(invoice)
      .where(
        and(eq(invoice.workspaceId, workspaceId), eq(invoice.number, number))
      )
      .limit(1)

    if (!taken) {
      return number
    }
  }

  return null
}
