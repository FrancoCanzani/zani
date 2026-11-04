import { and, eq } from "drizzle-orm"

import { customer } from "../../../../db/schema"
import { createDb } from "../../../../lib/db"

// Never write back to the customer: a stale draft would revert edits made on
// the Customers page.
export async function resolveInvoiceCustomer(
  env: Env,
  workspaceId: string,
  input: {
    customerId: string | null
    customerName: string
    customerPhone: string | null
    customerEmail: string | null
    customerAddress: string | null
    customerTaxId: string | null
  }
) {
  const name = input.customerName.trim()
  if (!name) {
    return {
      customerId: null,
      customerName: "",
      customerPhone: null as string | null,
      customerEmail: null as string | null,
      customerAddress: null as string | null,
      customerTaxId: null as string | null,
    }
  }

  if (input.customerId) {
    const db = createDb(env)
    const [existing] = await db
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.id, input.customerId),
          eq(customer.workspaceId, workspaceId)
        )
      )
      .limit(1)

    if (!existing) {
      return { error: "customer_not_found" as const }
    }
  }

  return {
    customerId: input.customerId,
    customerName: name,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    customerAddress: input.customerAddress,
    customerTaxId: input.customerTaxId,
  }
}
