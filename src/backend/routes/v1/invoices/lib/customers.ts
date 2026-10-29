import { and, eq } from "drizzle-orm"

import { customer } from "../../../../db/schema"
import { createDb } from "../../../../lib/db"
import { newId, nowMs } from "../../../../lib/utils"

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

  const db = createDb(env)
  const now = nowMs()
  const phone = input.customerPhone
  const email = input.customerEmail
  const address = input.customerAddress
  const taxId = input.customerTaxId

  if (input.customerId) {
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

    await db
      .update(customer)
      .set({
        name,
        phone,
        email,
        address,
        taxId,
        updatedAt: now,
      })
      .where(eq(customer.id, input.customerId))

    return {
      customerId: input.customerId,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      customerAddress: address,
      customerTaxId: taxId,
    }
  }

  const id = newId()
  await db.insert(customer).values({
    id,
    workspaceId,
    name,
    phone,
    email,
    address,
    taxId,
    notes: null,
    createdAt: now,
    updatedAt: now,
  })

  return {
    customerId: id,
    customerName: name,
    customerPhone: phone,
    customerEmail: email,
    customerAddress: address,
    customerTaxId: taxId,
  }
}
